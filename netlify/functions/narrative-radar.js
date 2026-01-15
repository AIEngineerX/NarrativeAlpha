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

// Fetch PumpFun trending/new launches
async function fetchPumpFunTrending() {
    const trends = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // PumpFun API - get coins sorted by various metrics
        // Try multiple endpoints for better coverage
        const endpoints = [
            'https://frontend-api.pump.fun/coins?offset=0&limit=20&sort=last_trade_timestamp&order=DESC&includeNsfw=false',
            'https://frontend-api.pump.fun/coins?offset=0&limit=20&sort=market_cap&order=DESC&includeNsfw=false'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: controller.signal
                });

                if (response.ok) {
                    const coins = await response.json();

                    if (Array.isArray(coins)) {
                        coins.slice(0, 10).forEach(coin => {
                            // Skip if already added
                            if (trends.find(t => t.address === coin.mint)) return;

                            const ageMs = coin.created_timestamp ? (Date.now() - coin.created_timestamp) : 0;
                            const ageHours = ageMs / (1000 * 60 * 60);
                            const marketCap = coin.usd_market_cap || coin.market_cap || 0;

                            // Determine engagement based on activity
                            let engagement = 'medium';
                            if (coin.reply_count > 50 || marketCap > 100000) engagement = 'viral';
                            else if (coin.reply_count > 10 || marketCap > 20000) engagement = 'high';

                            trends.push({
                                text: `$${coin.symbol} - ${coin.name}`,
                                description: coin.description?.slice(0, 100) || '',
                                source: 'pumpfun',
                                category: categorizeNarrative(coin.name + ' ' + coin.symbol + ' ' + (coin.description || '')),
                                engagement,
                                symbol: coin.symbol,
                                name: coin.name,
                                address: coin.mint,
                                marketCap,
                                ageHours: Math.round(ageHours * 10) / 10,
                                replyCount: coin.reply_count || 0,
                                isNew: ageHours < 1,
                                isFresh: ageHours < 24,
                                tokenExists: true
                            });
                        });
                    }
                }
            } catch (e) {
                console.warn('PumpFun endpoint failed:', e.message);
            }
        }

        clearTimeout(timeoutId);
    } catch (error) {
        console.warn('PumpFun fetch failed:', error.message);
    }

    return trends.slice(0, 8);
}

// Fetch X/Twitter trends via public aggregators
async function fetchXTrends() {
    const trends = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // Try multiple trend sources
        // Source 1: GetDayTrends (public Twitter trends)
        try {
            const response = await fetch('https://getdaytrends.com/united-states/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html'
                },
                signal: controller.signal
            });

            if (response.ok) {
                const html = await response.text();

                // Extract trending topics from HTML
                const trendPattern = /<a[^>]*href="[^"]*twitter\.com\/search[^"]*"[^>]*>([^<]+)</gi;
                const matches = html.matchAll(trendPattern);

                const cryptoKeywords = ['crypto', 'bitcoin', 'btc', 'eth', 'sol', 'solana', 'memecoin', 'token', 'coin', 'nft', 'degen', 'pump', 'moon', 'ape', 'pepe', 'doge', 'shib', 'ai', 'trump', 'elon'];

                for (const match of matches) {
                    const trend = match[1].trim();
                    const lowerTrend = trend.toLowerCase();

                    // Filter for crypto-adjacent trends
                    if (cryptoKeywords.some(kw => lowerTrend.includes(kw)) || trend.startsWith('$') || trend.startsWith('#')) {
                        if (!trends.find(t => t.text.toLowerCase() === lowerTrend)) {
                            trends.push({
                                text: trend,
                                source: 'twitter',
                                category: categorizeNarrative(trend),
                                engagement: 'trending',
                                tokenExists: trend.startsWith('$')
                            });
                        }
                    }

                    if (trends.length >= 5) break;
                }
            }
        } catch (e) {
            console.warn('GetDayTrends fetch failed:', e.message);
        }

        // Source 2: Check DEX Screener token profiles for Twitter links (active projects)
        if (trends.length < 3) {
            try {
                const dsResponse = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });

                if (dsResponse.ok) {
                    const profiles = await dsResponse.json();
                    const solanaProfiles = (profiles || [])
                        .filter(p => p.chainId === 'solana')
                        .slice(0, 10);

                    for (const profile of solanaProfiles) {
                        // Check if has Twitter link
                        const hasTwitter = profile.links?.some(l =>
                            l.type === 'twitter' || l.url?.includes('twitter.com') || l.url?.includes('x.com')
                        );

                        if (hasTwitter && profile.description) {
                            trends.push({
                                text: `${profile.description.slice(0, 60)}...`,
                                source: 'twitter',
                                category: categorizeNarrative(profile.description),
                                engagement: 'high',
                                address: profile.tokenAddress,
                                hasTwitter: true
                            });
                        }

                        if (trends.length >= 5) break;
                    }
                }
            } catch (e) {
                console.warn('DEX Screener profiles fetch failed:', e.message);
            }
        }

        clearTimeout(timeoutId);
    } catch (error) {
        console.warn('X trends fetch failed:', error.message);
    }

    // Add known active narratives if we couldn't fetch live data
    if (trends.length < 2) {
        trends.push(
            { text: '$AI agent coins trending', source: 'twitter', category: 'AI_TECH', engagement: 'high', tokenExists: false },
            { text: 'Solana memecoin meta', source: 'twitter', category: 'MEME_CULTURE', engagement: 'high', tokenExists: false }
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
