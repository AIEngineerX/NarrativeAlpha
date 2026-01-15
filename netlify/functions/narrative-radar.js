// Netlify Serverless Function for Early Narrative Detection
// Uses reliable APIs: CoinGecko, Reddit JSON, DEX Screener

let cache = {
    data: null,
    timestamp: 0,
    ttl: 120000 // 2 minute cache
};

// Narrative categories for classification
const NARRATIVE_CATEGORIES = {
    'AI_TECH': ['ai', 'artificial intelligence', 'gpt', 'chatgpt', 'agent', 'bot', 'llm', 'machine learning', 'virtual'],
    'POLITICAL': ['trump', 'biden', 'election', 'politics', 'government', 'maga', 'vote', 'president'],
    'CELEBRITY': ['elon', 'musk', 'kanye', 'drake', 'celebrity', 'famous', 'influencer'],
    'MEME_CULTURE': ['meme', 'viral', 'funny', 'lol', 'based', 'cope', 'wojak', 'pepe', 'npc', 'degen'],
    'ANIMAL': ['dog', 'cat', 'frog', 'shiba', 'doge', 'pepe', 'animal', 'pet', 'inu', 'wif', 'bonk'],
    'GAMING': ['game', 'gaming', 'esports', 'twitch', 'streamer', 'play', 'nft'],
    'NEWS_EVENT': ['breaking', 'just in', 'happening', 'news', 'announcement', 'revealed']
};

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < cache.ttl) {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ ...cache.data, cached: true })
        };
    }

    try {
        // Fetch from multiple RELIABLE sources in parallel
        const [coinGeckoTrending, redditTrends, dexScreenerTrending] = await Promise.allSettled([
            fetchCoinGeckoTrending(),
            fetchRedditTrends(),
            fetchDexScreenerTrending()
        ]);

        // Combine all trends
        const allTrends = [];

        if (coinGeckoTrending.status === 'fulfilled' && coinGeckoTrending.value) {
            allTrends.push(...coinGeckoTrending.value);
        }
        if (redditTrends.status === 'fulfilled' && redditTrends.value) {
            allTrends.push(...redditTrends.value);
        }
        if (dexScreenerTrending.status === 'fulfilled' && dexScreenerTrending.value) {
            allTrends.push(...dexScreenerTrending.value);
        }

        // Score and rank narratives
        const scoredNarratives = scoreNarratives(allTrends);

        // Get emerging narratives (high engagement)
        const emergingNarratives = scoredNarratives
            .filter(n => n.relevanceScore > 25)
            .slice(0, 12);

        const result = {
            narratives: emergingNarratives,
            lastUpdated: new Date().toISOString(),
            sources: {
                coingecko: coinGeckoTrending.status === 'fulfilled' ? (coinGeckoTrending.value?.length || 0) : 0,
                reddit: redditTrends.status === 'fulfilled' ? (redditTrends.value?.length || 0) : 0,
                dexscreener: dexScreenerTrending.status === 'fulfilled' ? (dexScreenerTrending.value?.length || 0) : 0
            }
        };

        cache.data = result;
        cache.timestamp = now;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=120'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Narrative radar error:', error);

        if (cache.data) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ ...cache.data, stale: true })
            };
        }

        // Return sample data if all else fails
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                narratives: getSampleNarratives(),
                lastUpdated: new Date().toISOString(),
                isSample: true
            })
        };
    }
};

// Fetch CoinGecko trending coins - RELIABLE API
async function fetchCoinGeckoTrending() {
    const trends = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const coins = data.coins || [];

            coins.forEach(item => {
                const coin = item.item;
                if (coin) {
                    trends.push({
                        text: `${coin.name} ($${coin.symbol}) trending on CoinGecko`,
                        source: 'coingecko',
                        category: categorizeNarrative(coin.name + ' ' + coin.symbol),
                        engagement: coin.score < 3 ? 'viral' : coin.score < 6 ? 'high' : 'medium',
                        marketCapRank: coin.market_cap_rank,
                        priceChange: coin.data?.price_change_percentage_24h?.usd || 0,
                        symbol: coin.symbol,
                        thumb: coin.thumb
                    });
                }
            });
        }
    } catch (error) {
        console.warn('CoinGecko trending fetch failed:', error.message);
    }

    return trends.slice(0, 8);
}

// Fetch Reddit crypto trends - RELIABLE JSON API
async function fetchRedditTrends() {
    const trends = [];
    const subreddits = ['cryptocurrency', 'solana', 'CryptoMoonShots', 'memecoin'];

    for (const sub of subreddits) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
                headers: {
                    'User-Agent': 'NarrativeAlpha/1.0 (Crypto Trend Tracker)',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                const posts = data.data?.children || [];

                for (const post of posts) {
                    const { title, score, num_comments, created_utc, subreddit } = post.data || {};

                    // Filter for high-engagement posts
                    if (score > 50 && title && title.length > 10) {
                        const ageHours = (Date.now() / 1000 - created_utc) / 3600;

                        // Prioritize recent hot posts
                        if (ageHours < 24) {
                            trends.push({
                                text: title.slice(0, 120),
                                source: 'reddit',
                                subreddit: subreddit,
                                category: categorizeNarrative(title),
                                engagement: score > 500 ? 'viral' : score > 200 ? 'high' : 'medium',
                                score,
                                comments: num_comments,
                                ageHours: Math.round(ageHours)
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`Reddit r/${sub} fetch failed:`, e.message);
            continue;
        }
    }

    // Sort by score and return top trends
    return trends.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
}

// Fetch DEX Screener trending/boosted tokens - RELIABLE API
async function fetchDexScreenerTrending() {
    const trends = [];

    try {
        // Get boosted tokens (paid promotions indicate activity)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1', {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const solanaTokens = (data || []).filter(t => t.chainId === 'solana').slice(0, 10);

            for (const token of solanaTokens) {
                // Get token details
                try {
                    const detailResponse = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${token.tokenAddress}`);
                    if (detailResponse.ok) {
                        const pairs = await detailResponse.json();
                        const pair = Array.isArray(pairs) && pairs[0];

                        if (pair && pair.baseToken) {
                            const priceChange = parseFloat(pair.priceChange?.h24 || 0);
                            const volume = parseFloat(pair.volume?.h24 || 0);

                            trends.push({
                                text: `$${pair.baseToken.symbol} boosted on DEX Screener`,
                                source: 'dexscreener',
                                category: categorizeNarrative(pair.baseToken.name + ' ' + pair.baseToken.symbol),
                                engagement: priceChange > 50 ? 'viral' : priceChange > 20 ? 'high' : 'medium',
                                symbol: pair.baseToken.symbol,
                                name: pair.baseToken.name,
                                priceChange24h: priceChange,
                                volume24h: volume,
                                address: token.tokenAddress
                            });
                        }
                    }
                } catch (e) {
                    // Skip this token
                }
            }
        }

        // Also get latest token profiles
        try {
            const profilesResponse = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
            if (profilesResponse.ok) {
                const profiles = await profilesResponse.json();
                const solanaProfiles = (profiles || []).filter(p => p.chainId === 'solana').slice(0, 5);

                for (const profile of solanaProfiles) {
                    if (!trends.find(t => t.address === profile.tokenAddress)) {
                        trends.push({
                            text: `New token profile: ${profile.description?.slice(0, 50) || 'Solana token'}`,
                            source: 'dexscreener',
                            category: categorizeNarrative(profile.description || ''),
                            engagement: 'medium',
                            address: profile.tokenAddress,
                            hasLinks: !!(profile.links?.length)
                        });
                    }
                }
            }
        } catch (e) {
            // Continue without profiles
        }

    } catch (error) {
        console.warn('DEX Screener trending fetch failed:', error.message);
    }

    return trends.slice(0, 6);
}

// Categorize a narrative based on keywords
function categorizeNarrative(text) {
    if (!text) return 'EMERGING';
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(NARRATIVE_CATEGORIES)) {
        if (keywords.some(kw => lowerText.includes(kw))) {
            return category;
        }
    }

    return 'EMERGING';
}

// Score narratives for relevance
function scoreNarratives(trends) {
    const narrativeMap = new Map();

    for (const trend of trends) {
        // Create a normalized key for grouping similar trends
        const textKey = (trend.text?.slice(0, 30) || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const key = trend.category + '_' + textKey;

        if (narrativeMap.has(key)) {
            const existing = narrativeMap.get(key);
            existing.mentions++;
            existing.sources.add(trend.source);
            if (trend.score) existing.totalScore += trend.score;
        } else {
            narrativeMap.set(key, {
                ...trend,
                mentions: 1,
                sources: new Set([trend.source]),
                totalScore: trend.score || 0
            });
        }
    }

    // Calculate relevance scores
    const scored = Array.from(narrativeMap.values()).map(n => {
        let score = 0;

        // Multi-platform bonus (big bonus for cross-platform trends)
        score += n.sources.size * 25;

        // Mention count bonus
        score += Math.min(n.mentions * 10, 30);

        // Engagement bonus
        if (n.engagement === 'viral') score += 30;
        else if (n.engagement === 'high') score += 20;
        else if (n.engagement === 'trending') score += 15;
        else score += 10;

        // Reddit score bonus
        if (n.totalScore > 500) score += 20;
        else if (n.totalScore > 200) score += 10;
        else if (n.totalScore > 50) score += 5;

        // Category bonus (actionable categories)
        if (['AI_TECH', 'CELEBRITY', 'POLITICAL', 'NEWS_EVENT'].includes(n.category)) {
            score += 10;
        }

        // CoinGecko trending bonus (very reliable signal)
        if (n.source === 'coingecko') {
            score += 15;
        }

        // DEX Screener boosted bonus
        if (n.source === 'dexscreener' && n.priceChange24h > 30) {
            score += 10;
        }

        return {
            ...n,
            sources: Array.from(n.sources),
            relevanceScore: Math.min(score, 100)
        };
    });

    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Sample narratives for fallback
function getSampleNarratives() {
    return [
        {
            text: 'AI agents dominating crypto narratives',
            source: 'coingecko',
            category: 'AI_TECH',
            engagement: 'viral',
            relevanceScore: 85,
            sources: ['coingecko', 'reddit'],
            suggestion: 'Watch for new AI agent token launches'
        },
        {
            text: 'Solana memecoins seeing renewed interest',
            source: 'reddit',
            category: 'MEME_CULTURE',
            engagement: 'high',
            relevanceScore: 72,
            sources: ['reddit', 'dexscreener'],
            suggestion: 'PumpFun launches showing activity'
        },
        {
            text: 'Political tokens heating up',
            source: 'dexscreener',
            category: 'POLITICAL',
            engagement: 'high',
            relevanceScore: 68,
            sources: ['dexscreener', 'reddit'],
            suggestion: 'Election narratives driving volume'
        },
        {
            text: 'Dog coin meta continuing strong',
            source: 'coingecko',
            category: 'ANIMAL',
            engagement: 'medium',
            relevanceScore: 55,
            sources: ['coingecko'],
            suggestion: 'WIF, BONK ecosystem tokens active'
        },
        {
            text: 'Gaming tokens showing momentum',
            source: 'reddit',
            category: 'GAMING',
            engagement: 'medium',
            relevanceScore: 48,
            sources: ['reddit'],
            suggestion: 'GameFi narratives resurging'
        }
    ];
}
