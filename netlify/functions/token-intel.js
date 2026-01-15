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

        const systemPrompt = `You are NarrativeAlpha's Token Intelligence module. You analyze Solana memecoins and provide REAL narrative context for degens - not generic financial advice.

MEMECOIN CONTEXT (critical for analysis):
- Low liquidity ($10k-100k) is NORMAL for early memecoins - don't flag this as a red flag unless <$5k
- Low market cap (<$1M) means EARLY opportunity, not inherently risky
- These are high-risk speculative plays by nature - degens know this
- Focus on narrative timing and social signals, not traditional fundamentals

Your job is to figure out:
1. WHY this token exists (what narrative/trend/meme it's riding)
2. WHO is likely behind it (dev patterns, cabal signals, influencer connections, organic community)
3. WHAT makes it tradeable (viral potential, narrative fit, social traction)
4. WHERE it is in the pump cycle (early discovery, mid accumulation, late distribution)

ORIGIN ANALYSIS - Be specific about patterns:
- "Dev cabal" = coordinated launch, similar contract patterns, known deployer wallets
- "Influencer play" = launched after CT mention, clear shill coordination
- "Organic viral" = genuine community meme, bottom-up growth, no clear coordination
- "AI/Tech narrative" = riding AI agent meta, tech narrative tokens
- "Culture/Political" = news event, trending topic, pop culture moment
- "Animal meta" = dog/cat/frog coins riding animal coin narrative
- "PumpFun rotation" = typical pump.fun launch pattern, following successful meta

SOCIAL SIGNALS - Analyze what's available:
- Has Twitter? Good sign of legitimacy attempt
- Has Telegram? Community coordination potential
- Has Website? More effort = potentially more serious
- No socials? Higher risk, but can still run if narrative is strong enough

Be CT-native and specific. Reference actual narratives and patterns from crypto twitter.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks.

Response format:
{
    "narrative_hook": "The ONE thing that makes this token exist - what's the meme/story? (1 sentence)",
    "likely_origin": "Specific origin analysis: cabal launch, influencer coordination, organic meme, narrative play, etc",
    "social_signals": ["Specific observations about social presence and what it suggests about the play"],
    "narrative_fit": "What meta/narrative does this fit (AI agents, dog coins, political, culture, tech, etc)",
    "timing_read": "EARLY (fresh, accumulation phase) | MID (narrative developing, gaining traction) | LATE (already pumped, exit liquidity risk) | UNKNOWN",
    "the_play": "The degen thesis - why would someone ape and what's the exit strategy? (1-2 sentences)",
    "red_flags": ["ONLY specific actionable concerns - not generic warnings about memecoins"],
    "similar_plays": ["Recent tokens with similar setup and how they performed"],
    "alpha_take": "Honest CT degen assessment - is this a send or skip? Why?"
}`;

        // Format social links for better context
        let socialsInfo = 'No social links found';
        if (tokenData.socials) {
            const socialList = [];
            if (tokenData.socials.twitter) socialList.push(`Twitter: ${typeof tokenData.socials.twitter === 'string' ? tokenData.socials.twitter : 'Yes'}`);
            if (tokenData.socials.telegram) socialList.push(`Telegram: ${typeof tokenData.socials.telegram === 'string' ? tokenData.socials.telegram : 'Yes'}`);
            if (tokenData.socials.website) socialList.push(`Website: ${typeof tokenData.socials.website === 'string' ? tokenData.socials.website : 'Yes'}`);
            if (tokenData.socials.discord) socialList.push(`Discord: Yes`);
            if (socialList.length > 0) {
                socialsInfo = socialList.join(', ');
            }
        }

        // Determine if this looks like a PumpFun token
        const isPumpFunStyle = tokenData.dexId === 'raydium' && tokenData.ageHours && tokenData.ageHours < 168;

        const tokenContext = `
TOKEN: $${tokenData.symbol} (${tokenData.name})
Contract: ${tokenData.address}

METRICS:
- Price: $${tokenData.price}
- Market Cap: $${tokenData.marketCap ? `$${Number(tokenData.marketCap).toLocaleString()}` : 'Unknown'}
- 24h Volume: $${tokenData.volume24h ? `$${Number(tokenData.volume24h).toLocaleString()}` : 'Unknown'}
- Liquidity: $${tokenData.liquidity ? `$${Number(tokenData.liquidity).toLocaleString()}` : 'Unknown'}
- 24h Price Change: ${tokenData.priceChange24h}%
- 1h Price Change: ${tokenData.priceChange1h}%
- Token Age: ${tokenData.ageHours ? (tokenData.ageHours < 24 ? `${tokenData.ageHours} hours (FRESH)` : `${Math.floor(tokenData.ageHours / 24)} days`) : 'Unknown'}
- DEX: ${tokenData.dexId || 'Unknown'}
${isPumpFunStyle ? '- Launch Type: Likely PumpFun-style launch (new Raydium memecoin)' : ''}
${tokenData.boostInfo?.isPaid ? `- DEX Promotion: PAID (${tokenData.boostInfo.type}) - dev is spending money on visibility` : ''}

SOCIAL PRESENCE:
${socialsInfo}
${tokenData.description ? `\nDescription/Bio: "${tokenData.description}"` : ''}
${tokenData.replyCount ? `PumpFun Reply Count: ${tokenData.replyCount} (indicates community engagement)` : ''}

Based on the token name, symbol, metrics, age, and social presence - analyze what narrative this token is playing, who likely launched it, and whether CT degens would ape this.`;

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
