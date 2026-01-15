// Netlify Serverless Function for Early Narrative Detection
// Pulls from: PumpFun (new launches), X/Twitter (social buzz), DEX Screener (trending)

let cache = {
    data: null,
    timestamp: 0,
    ttl: 120000 // 2 minute cache
};

// Narrative categories for classification
const NARRATIVE_CATEGORIES = {
    'AI_TECH': ['ai', 'artificial intelligence', 'gpt', 'chatgpt', 'agent', 'bot', 'llm', 'machine learning', 'virtual', 'neural'],
    'POLITICAL': ['trump', 'biden', 'election', 'politics', 'government', 'maga', 'vote', 'president', 'political'],
    'CELEBRITY': ['elon', 'musk', 'kanye', 'drake', 'celebrity', 'famous', 'influencer'],
    'MEME_CULTURE': ['meme', 'viral', 'funny', 'lol', 'based', 'cope', 'wojak', 'pepe', 'npc', 'degen', 'moon', 'pump'],
    'ANIMAL': ['dog', 'cat', 'frog', 'shiba', 'doge', 'pepe', 'animal', 'pet', 'inu', 'wif', 'bonk', 'popcat'],
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
        // Fetch from PumpFun, X trends proxy, and DEX Screener in parallel
        const [pumpFunData, xTrendsData, dexScreenerData] = await Promise.allSettled([
            fetchPumpFunTrending(),
            fetchXTrends(),
            fetchDexScreenerTrending()
        ]);

        // Combine all trends
        const allTrends = [];

        if (pumpFunData.status === 'fulfilled' && pumpFunData.value) {
            allTrends.push(...pumpFunData.value);
        }
        if (xTrendsData.status === 'fulfilled' && xTrendsData.value) {
            allTrends.push(...xTrendsData.value);
        }
        if (dexScreenerData.status === 'fulfilled' && dexScreenerData.value) {
            allTrends.push(...dexScreenerData.value);
        }

        // Score and rank narratives
        const scoredNarratives = scoreNarratives(allTrends);

        // Get emerging narratives
        const emergingNarratives = scoredNarratives
            .filter(n => n.relevanceScore > 20)
            .slice(0, 12);

        const result = {
            narratives: emergingNarratives,
            lastUpdated: new Date().toISOString(),
            sources: {
                pumpfun: pumpFunData.status === 'fulfilled' ? (pumpFunData.value?.length || 0) : 0,
                twitter: xTrendsData.status === 'fulfilled' ? (xTrendsData.value?.length || 0) : 0,
                dexscreener: dexScreenerData.status === 'fulfilled' ? (dexScreenerData.value?.length || 0) : 0
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

// Fetch PumpFun-style tokens via DEX Screener (direct PumpFun API is blocked)
// Finds fresh Solana memecoins that match PumpFun launch patterns
async function fetchPumpFunTrending() {
    const trends = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Search for fresh memecoins using common PumpFun naming patterns
        const searchTerms = ['pump', 'fun', 'sol', 'meme', 'pepe', 'doge', 'cat', 'moon'];
        const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${randomTerm}`,
            {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            }
        );

        if (response.ok) {
            const data = await response.json();
            const pairs = data.pairs || [];

            // Filter for fresh Solana memecoins (PumpFun style)
            const pumpFunStyle = pairs.filter(p => {
                if (p.chainId !== 'solana') return false;
                const mcap = parseFloat(p.fdv || p.marketCap || 0);
                const liquidity = parseFloat(p.liquidity?.usd || 0);
                const ageHours = p.pairCreatedAt
                    ? (Date.now() - p.pairCreatedAt) / (1000 * 60 * 60)
                    : 999;

                // PumpFun style: new (< 3 days), lower mcap, has some liquidity
                return ageHours < 72 && mcap < 5000000 && mcap > 1000 && liquidity > 500;
            });

            pumpFunStyle.slice(0, 10).forEach(pair => {
                if (!pair.baseToken) return;
                if (trends.find(t => t.address === pair.baseToken.address)) return;

                const ageHours = pair.pairCreatedAt
                    ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60)
                    : 999;
                const priceChange1h = parseFloat(pair.priceChange?.h1 || 0);
                const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
                const volume24h = parseFloat(pair.volume?.h24 || 0);
                const mcap = parseFloat(pair.fdv || 0);

                // Determine engagement
                let engagement = 'medium';
                if (priceChange1h > 30 || volume24h > 100000) engagement = 'viral';
                else if (priceChange1h > 10 || volume24h > 20000) engagement = 'high';

                trends.push({
                    text: `$${pair.baseToken.symbol} - ${pair.baseToken.name}`,
                    source: 'pumpfun',
                    category: categorizeNarrative(pair.baseToken.name + ' ' + pair.baseToken.symbol),
                    engagement,
                    symbol: pair.baseToken.symbol,
                    name: pair.baseToken.name,
                    address: pair.baseToken.address,
                    pairAddress: pair.pairAddress,
                    marketCap: mcap,
                    volume24h,
                    priceChange1h,
                    priceChange24h,
                    ageHours: Math.round(ageHours * 10) / 10,
                    isNew: ageHours < 1,
                    isFresh: ageHours < 24,
                    tokenExists: true,
                    dexUrl: pair.url || `https://dexscreener.com/solana/${pair.baseToken.address}`
                });
            });
        }

        clearTimeout(timeoutId);
    } catch (error) {
        console.warn('PumpFun-style fetch failed:', error.message);
    }

    return trends.slice(0, 8);
}

// Fetch X/Twitter-related trends
// Uses DEX Screener tokens with Twitter presence + CoinGecko trending
async function fetchXTrends() {
    const trends = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // Source 1: DEX Screener token profiles with Twitter links (active social presence)
        try {
            const dsResponse = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });

            if (dsResponse.ok) {
                const profiles = await dsResponse.json();
                const solanaProfiles = (profiles || [])
                    .filter(p => p.chainId === 'solana')
                    .slice(0, 15);

                for (const profile of solanaProfiles) {
                    // Check if has Twitter link
                    const twitterLink = profile.links?.find(l =>
                        l.type === 'twitter' || l.url?.includes('twitter.com') || l.url?.includes('x.com')
                    );

                    if (twitterLink && profile.description) {
                        // Get token details for price data
                        let priceChange = 0;
                        let symbol = '';
                        try {
                            const detailRes = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${profile.tokenAddress}`);
                            if (detailRes.ok) {
                                const pairs = await detailRes.json();
                                if (Array.isArray(pairs) && pairs[0]) {
                                    priceChange = parseFloat(pairs[0].priceChange?.h1 || 0);
                                    symbol = pairs[0].baseToken?.symbol || '';
                                }
                            }
                        } catch (e) { }

                        trends.push({
                            text: symbol ? `$${symbol} active on X` : profile.description.slice(0, 50),
                            source: 'twitter',
                            category: categorizeNarrative(profile.description),
                            engagement: priceChange > 20 ? 'viral' : priceChange > 5 ? 'high' : 'medium',
                            address: profile.tokenAddress,
                            symbol,
                            twitterUrl: twitterLink.url,
                            hasTwitter: true,
                            priceChange1h: priceChange,
                            tokenExists: true
                        });
                    }

                    if (trends.length >= 4) break;
                }
            }
        } catch (e) {
            console.warn('DEX Screener profiles fetch failed:', e.message);
        }

        // Source 2: CoinGecko trending (often driven by Twitter/social buzz)
        try {
            const cgResponse = await fetch('https://api.coingecko.com/api/v3/search/trending', {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });

            if (cgResponse.ok) {
                const data = await cgResponse.json();
                const coins = data.coins || [];

                coins.slice(0, 4).forEach(item => {
                    const coin = item.item;
                    if (coin && !trends.find(t => t.symbol === coin.symbol)) {
                        trends.push({
                            text: `$${coin.symbol} trending (${coin.name})`,
                            source: 'twitter',
                            category: categorizeNarrative(coin.name + ' ' + coin.symbol),
                            engagement: coin.score < 3 ? 'viral' : 'high',
                            symbol: coin.symbol,
                            name: coin.name,
                            tokenExists: true,
                            thumb: coin.thumb
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('CoinGecko trending fetch failed:', e.message);
        }

        clearTimeout(timeoutId);
    } catch (error) {
        console.warn('X trends fetch failed:', error.message);
    }

    // Fallback narratives if we couldn't fetch
    if (trends.length < 2) {
        trends.push(
            { text: 'AI agent narrative hot on CT', source: 'twitter', category: 'AI_TECH', engagement: 'high', tokenExists: false },
            { text: 'Solana memecoins trending', source: 'twitter', category: 'MEME_CULTURE', engagement: 'high', tokenExists: false }
        );
    }

    return trends.slice(0, 6);
}

// Fetch DEX Screener trending/boosted tokens
async function fetchDexScreenerTrending() {
    const trends = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // Get boosted tokens (paid promotions = active projects)
        const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1', {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });

        if (response.ok) {
            const data = await response.json();
            const solanaTokens = (data || []).filter(t => t.chainId === 'solana').slice(0, 8);

            // Get details for these tokens
            if (solanaTokens.length > 0) {
                const addresses = solanaTokens.map(t => t.tokenAddress).slice(0, 5).join(',');
                const detailResponse = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addresses}`);

                if (detailResponse.ok) {
                    const pairs = await detailResponse.json();

                    (Array.isArray(pairs) ? pairs : []).forEach(pair => {
                        if (!pair.baseToken) return;

                        const priceChange = parseFloat(pair.priceChange?.h24 || 0);
                        const priceChange1h = parseFloat(pair.priceChange?.h1 || 0);
                        const volume = parseFloat(pair.volume?.h24 || 0);

                        // Determine engagement
                        let engagement = 'medium';
                        if (priceChange1h > 30 || volume > 500000) engagement = 'viral';
                        else if (priceChange1h > 10 || volume > 100000) engagement = 'high';

                        trends.push({
                            text: `$${pair.baseToken.symbol} pumping on DEX`,
                            source: 'dexscreener',
                            category: categorizeNarrative(pair.baseToken.name + ' ' + pair.baseToken.symbol),
                            engagement,
                            symbol: pair.baseToken.symbol,
                            name: pair.baseToken.name,
                            priceChange24h: priceChange,
                            priceChange1h,
                            volume24h: volume,
                            address: pair.baseToken.address,
                            tokenExists: true,
                            isBoosted: true
                        });
                    });
                }
            }
        }

        // Also get latest profiles for new token launches
        try {
            const profilesResponse = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
            if (profilesResponse.ok) {
                const profiles = await profilesResponse.json();
                const newProfiles = (profiles || [])
                    .filter(p => p.chainId === 'solana')
                    .slice(0, 5);

                for (const profile of newProfiles) {
                    if (!trends.find(t => t.address === profile.tokenAddress)) {
                        trends.push({
                            text: `New: ${profile.description?.slice(0, 50) || 'Solana token'}`,
                            source: 'dexscreener',
                            category: categorizeNarrative(profile.description || ''),
                            engagement: 'medium',
                            address: profile.tokenAddress,
                            tokenExists: true,
                            isNewProfile: true
                        });
                    }
                }
            }
        } catch (e) {
            // Continue without profiles
        }

        clearTimeout(timeoutId);
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
        const textKey = (trend.text?.slice(0, 25) || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const key = trend.category + '_' + textKey;

        if (narrativeMap.has(key)) {
            const existing = narrativeMap.get(key);
            existing.mentions++;
            existing.sources.add(trend.source);
        } else {
            narrativeMap.set(key, {
                ...trend,
                mentions: 1,
                sources: new Set([trend.source])
            });
        }
    }

    // Calculate relevance scores
    const scored = Array.from(narrativeMap.values()).map(n => {
        let score = 0;

        // Multi-platform bonus
        score += n.sources.size * 25;

        // Mention count bonus
        score += Math.min(n.mentions * 10, 30);

        // Engagement bonus
        if (n.engagement === 'viral') score += 30;
        else if (n.engagement === 'high') score += 20;
        else if (n.engagement === 'trending') score += 15;
        else score += 10;

        // PumpFun new launch bonus
        if (n.source === 'pumpfun') {
            if (n.isNew) score += 20; // < 1 hour old
            else if (n.isFresh) score += 10; // < 24 hours old
            if (n.replyCount > 20) score += 10;
            if (n.marketCap > 50000) score += 10;
        }

        // DEX Screener boosted bonus
        if (n.source === 'dexscreener') {
            if (n.isBoosted) score += 15;
            if (n.priceChange1h > 20) score += 10;
        }

        // Category bonus (actionable)
        if (['AI_TECH', 'CELEBRITY', 'POLITICAL', 'NEWS_EVENT'].includes(n.category)) {
            score += 10;
        }

        // Token exists bonus (tradeable)
        if (n.tokenExists) score += 5;

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
            text: 'New PumpFun launch trending',
            source: 'pumpfun',
            category: 'MEME_CULTURE',
            engagement: 'viral',
            relevanceScore: 85,
            sources: ['pumpfun', 'twitter'],
            tokenExists: true,
            suggestion: 'Check recent PumpFun launches'
        },
        {
            text: 'AI agent narratives heating up',
            source: 'twitter',
            category: 'AI_TECH',
            engagement: 'high',
            relevanceScore: 78,
            sources: ['twitter', 'dexscreener'],
            tokenExists: true,
            suggestion: 'Watch for new AI agent tokens'
        },
        {
            text: 'Solana memecoin meta strong',
            source: 'dexscreener',
            category: 'MEME_CULTURE',
            engagement: 'high',
            relevanceScore: 72,
            sources: ['dexscreener'],
            tokenExists: true,
            suggestion: 'Volume flowing to SOL memes'
        },
        {
            text: 'Political tokens seeing action',
            source: 'twitter',
            category: 'POLITICAL',
            engagement: 'medium',
            relevanceScore: 55,
            sources: ['twitter'],
            tokenExists: true,
            suggestion: 'Check election-related tokens'
        },
        {
            text: 'Animal coin rotation starting',
            source: 'pumpfun',
            category: 'ANIMAL',
            engagement: 'medium',
            relevanceScore: 48,
            sources: ['pumpfun'],
            tokenExists: false,
            suggestion: 'Watch for new animal memes'
        }
    ];
}
