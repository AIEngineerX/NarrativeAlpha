// Netlify Serverless Function for Social Trends
// Aggregates public crypto trending data from free sources (CoinGecko, DEX Screener)

// Cache to avoid hammering APIs
let cache = {
    data: null,
    timestamp: 0,
    ttl: 300000 // 5 minute cache
};

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Check cache
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
        const trends = {
            coingeckoTrending: [],
            dexScreenerTrending: [],
            hotCategories: [],
            aggregatedTrends: [],
            lastUpdated: new Date().toISOString()
        };

        // Source 1: CoinGecko Trending (Free, no auth required)
        try {
            const cgResponse = await fetch('https://api.coingecko.com/api/v3/search/trending', {
                headers: { 'Accept': 'application/json' }
            });

            if (cgResponse.ok) {
                const cgData = await cgResponse.json();
                trends.coingeckoTrending = (cgData.coins || []).slice(0, 7).map((item, index) => ({
                    rank: index + 1,
                    name: item.item.name,
                    symbol: item.item.symbol.toUpperCase(),
                    marketCapRank: item.item.market_cap_rank,
                    priceChange24h: item.item.data?.price_change_percentage_24h?.usd || 0,
                    thumb: item.item.thumb,
                    source: 'coingecko'
                }));
            }
        } catch (e) {
            console.warn('CoinGecko fetch failed:', e.message);
        }

        // Source 2: DEX Screener Token Profiles (shows promoted/active tokens)
        try {
            const dsResponse = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');

            if (dsResponse.ok) {
                const dsData = await dsResponse.json();
                const solanaTokens = (dsData || [])
                    .filter(p => p.chainId === 'solana')
                    .slice(0, 10);

                // Get additional data for these tokens
                if (solanaTokens.length > 0) {
                    const addresses = solanaTokens.map(t => t.tokenAddress).join(',');
                    const detailResponse = await fetch(
                        `https://api.dexscreener.com/tokens/v1/solana/${addresses}`
                    );

                    if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        trends.dexScreenerTrending = (Array.isArray(detailData) ? detailData : [])
                            .slice(0, 7)
                            .map((pair, index) => ({
                                rank: index + 1,
                                name: pair.baseToken?.name || 'Unknown',
                                symbol: pair.baseToken?.symbol || '???',
                                priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                                priceChange1h: parseFloat(pair.priceChange?.h1 || 0),
                                volume24h: parseFloat(pair.volume?.h24 || 0),
                                source: 'dexscreener'
                            }));
                    }
                }
            }
        } catch (e) {
            console.warn('DEX Screener trending fetch failed:', e.message);
        }

        // Source 3: CoinGecko Categories (to identify hot narratives)
        try {
            const catResponse = await fetch(
                'https://api.coingecko.com/api/v3/coins/categories?order=market_cap_change_24h_desc'
            );

            if (catResponse.ok) {
                const catData = await catResponse.json();
                // Filter for relevant crypto categories
                const relevantCategories = (catData || []).filter(cat => {
                    const name = cat.name.toLowerCase();
                    return name.includes('meme') ||
                           name.includes('ai') ||
                           name.includes('gaming') ||
                           name.includes('defi') ||
                           name.includes('dog') ||
                           name.includes('cat') ||
                           name.includes('solana') ||
                           Math.abs(cat.market_cap_change_24h || 0) > 5;
                });

                trends.hotCategories = relevantCategories.slice(0, 5).map(cat => ({
                    name: cat.name,
                    change24h: cat.market_cap_change_24h,
                    volume24h: cat.volume_24h,
                    marketCap: cat.market_cap
                }));
            }
        } catch (e) {
            console.warn('CoinGecko categories fetch failed:', e.message);
        }

        // Aggregate and deduplicate trends
        const allTokens = [
            ...trends.coingeckoTrending,
            ...trends.dexScreenerTrending
        ];

        // Deduplicate by symbol
        const seen = new Set();
        trends.aggregatedTrends = allTokens
            .filter(t => {
                const key = t.symbol.toUpperCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.rank - b.rank)
            .slice(0, 10);

        // Update cache
        cache.data = trends;
        cache.timestamp = now;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300'
            },
            body: JSON.stringify(trends)
        };

    } catch (error) {
        console.error('Social trends function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};
