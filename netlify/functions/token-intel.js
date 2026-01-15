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
        let tokenData;
        try {
            tokenData = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid JSON body' })
            };
        }

        // Validate required fields
        if (!tokenData || typeof tokenData !== 'object') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Token data is required' })
            };
        }

        if (!tokenData.symbol || typeof tokenData.symbol !== 'string' || tokenData.symbol.length > 20) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Valid token symbol is required' })
            };
        }

        // Sanitize string fields to prevent prompt injection (limit lengths)
        const sanitize = (str, maxLen = 500) => {
            if (!str || typeof str !== 'string') return '';
            return str.slice(0, maxLen);
        };

        tokenData.name = sanitize(tokenData.name, 100);
        tokenData.description = sanitize(tokenData.description, 500);
        tokenData.symbol = sanitize(tokenData.symbol, 20);

        const systemPrompt = `You are NarrativeAlpha's Token Intelligence module. You analyze Solana memecoins and provide REAL narrative context for degens - not generic financial advice.

CRITICAL MINDSET:
- You are analyzing for DEGENS who WANT to find plays, not scare them off
- Your job is to find reasons WHY a token could pump, not list reasons to avoid
- Generic warnings like "high risk", "volatile", "speculative" are USELESS - degens already know this
- Be BULLISH by default unless there's a SPECIFIC, CONCRETE red flag

MEMECOIN CONTEXT (critical for analysis):
- Low liquidity ($10k-100k) is NORMAL for early memecoins - NOT a red flag
- Low market cap (<$1M) means EARLY opportunity, not risk
- No website/socials is COMMON for pump.fun launches - can still 10x
- High MC/Liq ratio is NORMAL for memecoins - only flag if >200x
- Price volatility is EXPECTED - not a warning
- New tokens (<24h) naturally have low volume - don't flag this

ONLY FLAG AS RED FLAG IF:
- Token is ACTUALLY a confirmed rug/honeypot (sells blocked)
- Obvious copy/scam of known token with deceptive intent
- Dev wallet holds >50% supply AND is actively dumping
- Liquidity is literally <$1,000 (micro liquidity)
- Contract has actual malicious code (not just standard pump.fun contract)

DO NOT FLAG AS RED FLAG:
- Low market cap, low liquidity, low volume (this is EARLY, not bad)
- No socials (many successful tokens start this way)
- New/unverified contract (all tokens start this way)
- High volatility (this is what degens want)
- "Could go to zero" (degens know this)

Your job is to figure out:
1. WHY this token exists (what narrative/trend/meme it's riding)
2. WHAT makes it tradeable (viral potential, narrative fit, social traction)
3. WHERE it is in the pump cycle (early discovery, mid accumulation, late distribution)

Be CT-native and specific. Reference actual narratives and patterns from crypto twitter.

IMPORTANT:
- Respond ONLY with valid JSON. No markdown, no code blocks.
- Keep red_flags array EMPTY unless there's a SPECIFIC, CONCRETE issue
- alpha_take should lean BULLISH - find the angle, don't just say "skip"

Response format:
{
    "narrative_hook": "The ONE thing that makes this token exist - what's the meme/story? (1 sentence)",
    "likely_origin": "Specific origin analysis: cabal launch, influencer coordination, organic meme, narrative play, etc",
    "social_signals": ["Specific observations about social presence and what it suggests about the play"],
    "narrative_fit": "What meta/narrative does this fit (AI agents, dog coins, political, culture, tech, etc)",
    "timing_read": "EARLY (fresh, accumulation phase) | MID (narrative developing, gaining traction) | LATE (already pumped, exit liquidity risk) | UNKNOWN",
    "the_play": "The degen thesis - why would someone ape and what's the exit strategy? (1-2 sentences)",
    "red_flags": ["ONLY specific actionable concerns - leave EMPTY if nothing concrete"],
    "similar_plays": ["Recent tokens with similar setup and how they performed"],
    "alpha_take": "Bullish angle and entry strategy - find the play, don't just dismiss"
}`;

        // Format social links for better context
        // DEX Screener provides socials as array: [{type: "twitter", url: "..."}, ...]
        // Some sources provide as object: {twitter: "url", telegram: "url"}
        let socialsInfo = 'No social links found';
        if (tokenData.socials) {
            const socialList = [];

            // Handle array format (DEX Screener style)
            if (Array.isArray(tokenData.socials)) {
                tokenData.socials.forEach(social => {
                    const type = (social.type || social.label || '').toLowerCase();
                    const url = social.url || '';
                    if (type.includes('twitter') || type.includes('x.com') || url.includes('twitter.com') || url.includes('x.com')) {
                        socialList.push(`Twitter/X: ${url || 'Yes'}`);
                    } else if (type.includes('telegram') || url.includes('t.me')) {
                        socialList.push(`Telegram: ${url || 'Yes'}`);
                    } else if (type.includes('discord') || url.includes('discord')) {
                        socialList.push(`Discord: ${url || 'Yes'}`);
                    } else if (type.includes('tiktok') || url.includes('tiktok')) {
                        socialList.push(`TikTok: ${url || 'Yes'}`);
                    } else if (type.includes('website') || type.includes('web')) {
                        socialList.push(`Website: ${url || 'Yes'}`);
                    } else if (url) {
                        socialList.push(`${type || 'Link'}: ${url}`);
                    }
                });
            }
            // Handle object format
            else if (typeof tokenData.socials === 'object') {
                if (tokenData.socials.twitter) socialList.push(`Twitter/X: ${typeof tokenData.socials.twitter === 'string' ? tokenData.socials.twitter : 'Yes'}`);
                if (tokenData.socials.telegram) socialList.push(`Telegram: ${typeof tokenData.socials.telegram === 'string' ? tokenData.socials.telegram : 'Yes'}`);
                if (tokenData.socials.website) socialList.push(`Website: ${typeof tokenData.socials.website === 'string' ? tokenData.socials.website : 'Yes'}`);
                if (tokenData.socials.discord) socialList.push(`Discord: ${typeof tokenData.socials.discord === 'string' ? tokenData.socials.discord : 'Yes'}`);
                if (tokenData.socials.tiktok) socialList.push(`TikTok: ${typeof tokenData.socials.tiktok === 'string' ? tokenData.socials.tiktok : 'Yes'}`);
            }

            if (socialList.length > 0) {
                socialsInfo = socialList.join(', ');
            }
        }

        // Also check for websites array from DEX Screener
        if (tokenData.websites && Array.isArray(tokenData.websites) && tokenData.websites.length > 0) {
            const websiteUrls = tokenData.websites.map(w => w.url || w).filter(Boolean);
            if (websiteUrls.length > 0 && socialsInfo === 'No social links found') {
                socialsInfo = `Website: ${websiteUrls[0]}`;
            } else if (websiteUrls.length > 0 && !socialsInfo.includes('Website')) {
                socialsInfo += `, Website: ${websiteUrls[0]}`;
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
            // Log error server-side but don't expose raw content to client
            console.error('Failed to parse AI response:', e.message);
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
