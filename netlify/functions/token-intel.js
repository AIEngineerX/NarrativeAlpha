// Netlify Serverless Function for Token Intelligence Analysis
// Generates narrative context and social intel for specific tokens

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }

    try {
        const tokenData = JSON.parse(event.body);

        if (!tokenData.symbol) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Token data is required' })
            };
        }

        const systemPrompt = `You are NarrativeAlpha's Token Intelligence module. You analyze memecoin/crypto tokens and provide REAL narrative context - not just restating metrics.

Your job is to figure out:
1. WHY this token exists (what narrative/trend it's riding)
2. WHO might be behind it or promoting it (based on patterns)
3. WHAT the play is (why degens are interested)
4. Whether this is EARLY or LATE in the narrative cycle

Be specific and CT-native. Reference real narratives, trends, and patterns you know from crypto twitter.

IMPORTANT: Respond ONLY with valid JSON. No markdown.

Response format:
{
    "narrative_hook": "The ONE thing that explains why this token exists (1 sentence)",
    "likely_origin": "Your best guess on where this came from - CT cabal, influencer pump, organic viral, AI meta, etc",
    "social_signals": ["What CT/social patterns suggest about this token - be specific"],
    "narrative_fit": "What broader narrative does this fit into (AI agents, animal coins, political, culture, etc)",
    "timing_read": "EARLY (just starting) | MID (developing) | LATE (probably exit liquidity) | UNKNOWN",
    "the_play": "If someone were to ape this, what's the thesis in 1-2 sentences",
    "red_flags": ["Specific concerns - not generic warnings"],
    "similar_plays": ["Recent tokens that followed similar pattern and how they performed"],
    "alpha_take": "Your honest degen assessment - would CT anons ape this? Why or why not?"
}`;

        const tokenContext = `
Token: $${tokenData.symbol} (${tokenData.name})
Contract: ${tokenData.address}
Price: $${tokenData.price}
Market Cap: $${tokenData.marketCap}
24h Volume: $${tokenData.volume24h}
Liquidity: $${tokenData.liquidity}
24h Change: ${tokenData.priceChange24h}%
1h Change: ${tokenData.priceChange1h}%
Age: ${tokenData.ageHours ? tokenData.ageHours + ' hours' : 'Unknown'}
DEX: ${tokenData.dexId || 'Unknown'}
${tokenData.description ? `Description: ${tokenData.description}` : ''}
${tokenData.socials ? `Socials: Twitter: ${tokenData.socials.twitter ? 'Yes' : 'No'}, Telegram: ${tokenData.socials.telegram ? 'Yes' : 'No'}, Website: ${tokenData.socials.website ? 'Yes' : 'No'}` : ''}
${tokenData.replyCount ? `PumpFun Replies: ${tokenData.replyCount}` : ''}

Analyze this token and provide narrative intelligence. What's the STORY here? Why would CT care about this?`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: tokenContext
                    }
                ],
                system: systemPrompt
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: error.error?.message || 'API request failed' })
            };
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Parse JSON response
        let result;
        try {
            let jsonStr = content;
            if (content.includes('```json')) {
                jsonStr = content.split('```json')[1].split('```')[0];
            } else if (content.includes('```')) {
                jsonStr = content.split('```')[1].split('```')[0];
            }
            result = JSON.parse(jsonStr.trim());
        } catch (e) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to parse AI response', raw: content })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};
