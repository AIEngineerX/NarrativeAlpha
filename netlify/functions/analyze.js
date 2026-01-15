// Netlify Serverless Function for NarrativeAlpha
// This function proxies requests to the Anthropic API

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }

    try {
        const { query, liveData } = JSON.parse(event.body);

        if (!query) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Query is required' })
            };
        }

        // Build live data context if available
        let liveDataContext = '';
        if (liveData && liveData.length > 0) {
            liveDataContext = `\n\nCURRENT LIVE TOKEN DATA (Top movers from DEX Screener):\n`;
            liveData.forEach((token, i) => {
                liveDataContext += `${i + 1}. $${token.symbol} (${token.name})\n`;
                liveDataContext += `   Price: $${token.price} | 1h: ${token.priceChange1h > 0 ? '+' : ''}${token.priceChange1h?.toFixed(1) || 0}% | 24h: ${token.priceChange24h > 0 ? '+' : ''}${token.priceChange24h?.toFixed(1) || 0}%\n`;
                liveDataContext += `   Vol: $${(token.volume24h || 0).toLocaleString()} | MCap: $${(token.marketCap || 0).toLocaleString()}\n`;
            });
            liveDataContext += `\nUse this REAL data to inform your analysis. Reference specific tokens that are actually moving.`;
        }

        const systemPrompt = `You are NarrativeAlpha, an expert AI system specialized in detecting emerging memecoin narratives and crypto market trends. Your role is to analyze social signals, identify potential narrative plays, and provide actionable intelligence.

Your analysis style:
- Be direct and punchy, like CT (Crypto Twitter) alpha calls
- Focus on actionable insights, not generic advice
- Identify specific narrative themes, potential tickers, and timing
- Assess risk vectors honestly
- Use crypto-native terminology
${liveData ? '- When live data is provided, reference ACTUAL tokens that are moving' : ''}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON.

Response format:
{
    "narrative_name": "Short catchy name for the narrative",
    "confidence": 0-100,
    "velocity_score": 1.0-10.0,
    "alert_level": "LOW|MEDIUM|HIGH|URGENT",
    "summary": "2-3 sentence explanation of the narrative and why it matters",
    "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
    "suggested_tickers": ["TICKER1", "TICKER2", "TICKER3"],
    "risk_vectors": ["risk 1", "risk 2", "risk 3"],
    "timeline": "Expected window for this narrative (e.g., '24-48 hours', '1-2 weeks')",
    "actionable_intel": "Specific actionable advice for traders"
}`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                messages: [
                    {
                        role: 'user',
                        content: `Analyze this narrative query and provide intelligence:\n\n${query}${liveDataContext}`
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
                body: JSON.stringify({ error: 'Failed to parse AI response' })
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
