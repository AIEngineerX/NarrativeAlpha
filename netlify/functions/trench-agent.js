// Trench Agent - AI-powered PumpFun scanner for fresh legitimate launches
// Finds new tokens and analyzes them for legitimacy signals

let cache = {
    data: null,
    timestamp: 0,
    ttl: 60000 // 1 minute cache - faster refresh for fresh launches
};

// Legitimacy scoring weights
const LEGIT_SIGNALS = {
    HAS_SOCIAL: 15,          // Has Twitter/Telegram
    GOOD_DEV_HISTORY: 20,    // Dev wallet looks clean
    HEALTHY_DISTRIBUTION: 15, // Not concentrated in few wallets
    ORGANIC_VOLUME: 20,      // Volume looks organic, not wash
    GOOD_BUY_SELL_RATIO: 10, // Balanced buy/sell (not all buys = likely rug setup)
    GROWING_HOLDERS: 10,     // Holder count increasing
    REASONABLE_MCAP: 10      // Not suspiciously high MC for age
};

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < cache.ttl) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ ...cache.data, cached: true })
        };
    }

    try {
        // Fetch fresh PumpFun-style tokens from multiple angles
        const [freshLaunches, trendingNew, recentProfiles] = await Promise.allSettled([
            fetchFreshPumpFunTokens(),
            fetchTrendingNewTokens(),
            fetchRecentProfiles()
        ]);

        let allTokens = [];

        if (freshLaunches.status === 'fulfilled' && freshLaunches.value) {
            allTokens.push(...freshLaunches.value);
        }
        if (trendingNew.status === 'fulfilled' && trendingNew.value) {
            allTokens.push(...trendingNew.value);
        }
        if (recentProfiles.status === 'fulfilled' && recentProfiles.value) {
            allTokens.push(...recentProfiles.value);
        }

        // Deduplicate by address
        const seen = new Set();
        const uniqueTokens = allTokens.filter(t => {
            if (!t.address || seen.has(t.address)) return false;
            seen.add(t.address);
            return true;
        });

        // Score and analyze each token for legitimacy
        const analyzedTokens = uniqueTokens.map(token => analyzeTokenLegitimacy(token));

        // Sort by legitimacy score (highest first)
        analyzedTokens.sort((a, b) => b.legitScore - a.legitScore);

        // Take top 15 most legitimate looking tokens
        const topTokens = analyzedTokens.slice(0, 15);

        // Categorize results
        const result = {
            freshGems: topTokens.filter(t => t.legitScore >= 60 && t.ageHours < 6),
            watchlist: topTokens.filter(t => t.legitScore >= 40 && t.legitScore < 60),
            risky: topTokens.filter(t => t.legitScore < 40),
            allScanned: analyzedTokens.length,
            lastUpdated: new Date().toISOString(),
            scanStats: {
                totalFound: uniqueTokens.length,
                passedFilters: topTokens.length,
                avgLegitScore: Math.round(topTokens.reduce((sum, t) => sum + t.legitScore, 0) / topTokens.length) || 0
            }
        };

        cache.data = result;
        cache.timestamp = now;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Trench agent error:', error);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                freshGems: [],
                watchlist: [],
                risky: [],
                error: 'Scan temporarily unavailable',
                lastUpdated: new Date().toISOString()
            })
        };
    }
};

// Fetch fresh tokens that look like PumpFun launches
async function fetchFreshPumpFunTokens() {
    const tokens = [];
    const searchTerms = ['pump', 'moon', 'pepe', 'dog', 'cat', 'ai', 'meme', 'sol', 'based', 'wojak'];

    try {
        // Search for multiple terms to get variety
        const termPromises = searchTerms.slice(0, 4).map(async (term) => {
            try {
                const response = await fetch(
                    `https://api.dexscreener.com/latest/dex/search?q=${term}`,
                    { headers: { 'Accept': 'application/json' } }
                );
                if (!response.ok) return [];
                const data = await response.json();
                return data.pairs || [];
            } catch (e) {
                return [];
            }
        });

        const results = await Promise.all(termPromises);
        const allPairs = results.flat();

        // Filter for fresh Solana PumpFun-style tokens
        for (const pair of allPairs) {
            if (pair.chainId !== 'solana') continue;
            if (!pair.baseToken?.address) continue;

            const ageMs = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) : Infinity;
            const ageHours = ageMs / (1000 * 60 * 60);
            const mcap = parseFloat(pair.fdv || pair.marketCap || 0);
            const volume = parseFloat(pair.volume?.h24 || 0);
            const liquidity = parseFloat(pair.liquidity?.usd || 0);

            // Fresh launch criteria: < 48h old, reasonable mcap range, has some activity
            if (ageHours > 48) continue;
            if (mcap < 1000 || mcap > 10000000) continue; // $1k - $10M mcap
            if (volume < 100) continue; // At least some volume
            if (liquidity < 500) continue; // Minimum liquidity

            // Check if it's a PumpFun token (address ends with 'pump' or on pumpfun dex)
            const isPumpFun = (
                pair.baseToken.address.toLowerCase().endsWith('pump') ||
                (pair.dexId || '').toLowerCase().includes('pump') ||
                (pair.url || '').toLowerCase().includes('pump.fun')
            );

            tokens.push({
                address: pair.baseToken.address,
                symbol: pair.baseToken.symbol || '???',
                name: pair.baseToken.name || 'Unknown',
                price: parseFloat(pair.priceUsd || 0),
                mcap,
                volume24h: volume,
                volume1h: parseFloat(pair.volume?.h1 || 0),
                liquidity,
                priceChange5m: parseFloat(pair.priceChange?.m5 || 0),
                priceChange1h: parseFloat(pair.priceChange?.h1 || 0),
                priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                buys24h: pair.txns?.h24?.buys || 0,
                sells24h: pair.txns?.h24?.sells || 0,
                buys1h: pair.txns?.h1?.buys || 0,
                sells1h: pair.txns?.h1?.sells || 0,
                ageHours: Math.round(ageHours * 10) / 10,
                pairAddress: pair.pairAddress,
                dexUrl: pair.url || `https://dexscreener.com/solana/${pair.baseToken.address}`,
                isPumpFun,
                hasSocials: !!(pair.info?.socials?.length > 0),
                hasWebsite: !!(pair.info?.websites?.length > 0),
                imageUrl: pair.info?.imageUrl || null
            });
        }
    } catch (error) {
        console.warn('Fresh PumpFun fetch error:', error.message);
    }

    return tokens;
}

// Fetch trending new tokens
async function fetchTrendingNewTokens() {
    const tokens = [];

    try {
        const response = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
        if (!response.ok) return tokens;

        const boosts = await response.json();
        const solanaBoosts = (boosts || []).filter(b => b.chainId === 'solana').slice(0, 10);

        if (solanaBoosts.length > 0) {
            const addresses = solanaBoosts.map(b => b.tokenAddress).join(',');
            const detailResponse = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addresses}`);

            if (detailResponse.ok) {
                const pairs = await detailResponse.json();

                for (const pair of (Array.isArray(pairs) ? pairs : [])) {
                    if (!pair.baseToken?.address) continue;

                    const ageMs = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) : Infinity;
                    const ageHours = ageMs / (1000 * 60 * 60);

                    if (ageHours > 72) continue; // Only tokens < 3 days old

                    tokens.push({
                        address: pair.baseToken.address,
                        symbol: pair.baseToken.symbol || '???',
                        name: pair.baseToken.name || 'Unknown',
                        price: parseFloat(pair.priceUsd || 0),
                        mcap: parseFloat(pair.fdv || 0),
                        volume24h: parseFloat(pair.volume?.h24 || 0),
                        volume1h: parseFloat(pair.volume?.h1 || 0),
                        liquidity: parseFloat(pair.liquidity?.usd || 0),
                        priceChange5m: parseFloat(pair.priceChange?.m5 || 0),
                        priceChange1h: parseFloat(pair.priceChange?.h1 || 0),
                        priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                        buys24h: pair.txns?.h24?.buys || 0,
                        sells24h: pair.txns?.h24?.sells || 0,
                        buys1h: pair.txns?.h1?.buys || 0,
                        sells1h: pair.txns?.h1?.sells || 0,
                        ageHours: Math.round(ageHours * 10) / 10,
                        pairAddress: pair.pairAddress,
                        dexUrl: pair.url || `https://dexscreener.com/solana/${pair.baseToken.address}`,
                        isPumpFun: pair.baseToken.address.toLowerCase().endsWith('pump'),
                        isBoosted: true,
                        hasSocials: !!(pair.info?.socials?.length > 0),
                        hasWebsite: !!(pair.info?.websites?.length > 0)
                    });
                }
            }
        }
    } catch (error) {
        console.warn('Trending new tokens fetch error:', error.message);
    }

    return tokens;
}

// Fetch recent token profiles (newly listed)
async function fetchRecentProfiles() {
    const tokens = [];

    try {
        const response = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
        if (!response.ok) return tokens;

        const profiles = await response.json();
        const solanaProfiles = (profiles || []).filter(p => p.chainId === 'solana').slice(0, 15);

        if (solanaProfiles.length > 0) {
            const addresses = solanaProfiles.map(p => p.tokenAddress).slice(0, 10).join(',');
            const detailResponse = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addresses}`);

            if (detailResponse.ok) {
                const pairs = await detailResponse.json();

                for (const pair of (Array.isArray(pairs) ? pairs : [])) {
                    if (!pair.baseToken?.address) continue;

                    const ageMs = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) : Infinity;
                    const ageHours = ageMs / (1000 * 60 * 60);
                    const mcap = parseFloat(pair.fdv || 0);

                    if (ageHours > 48 || mcap > 5000000) continue;

                    const profile = solanaProfiles.find(p => p.tokenAddress === pair.baseToken.address);

                    tokens.push({
                        address: pair.baseToken.address,
                        symbol: pair.baseToken.symbol || '???',
                        name: pair.baseToken.name || 'Unknown',
                        price: parseFloat(pair.priceUsd || 0),
                        mcap,
                        volume24h: parseFloat(pair.volume?.h24 || 0),
                        volume1h: parseFloat(pair.volume?.h1 || 0),
                        liquidity: parseFloat(pair.liquidity?.usd || 0),
                        priceChange5m: parseFloat(pair.priceChange?.m5 || 0),
                        priceChange1h: parseFloat(pair.priceChange?.h1 || 0),
                        priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                        buys24h: pair.txns?.h24?.buys || 0,
                        sells24h: pair.txns?.h24?.sells || 0,
                        buys1h: pair.txns?.h1?.buys || 0,
                        sells1h: pair.txns?.h1?.sells || 0,
                        ageHours: Math.round(ageHours * 10) / 10,
                        pairAddress: pair.pairAddress,
                        dexUrl: pair.url || `https://dexscreener.com/solana/${pair.baseToken.address}`,
                        isPumpFun: pair.baseToken.address.toLowerCase().endsWith('pump'),
                        hasProfile: true,
                        description: profile?.description || null,
                        hasSocials: !!(profile?.links?.some(l => l.type === 'twitter' || l.type === 'telegram')),
                        hasWebsite: !!(profile?.links?.some(l => l.type === 'website'))
                    });
                }
            }
        }
    } catch (error) {
        console.warn('Recent profiles fetch error:', error.message);
    }

    return tokens;
}

// Analyze token for legitimacy signals
function analyzeTokenLegitimacy(token) {
    let legitScore = 0;
    const flags = [];
    const positives = [];

    // 1. Social presence check
    if (token.hasSocials || token.hasWebsite) {
        legitScore += LEGIT_SIGNALS.HAS_SOCIAL;
        positives.push('Has socials');
    } else {
        flags.push('No socials');
    }

    // 2. Volume analysis - organic vs wash
    const totalTxns = (token.buys24h || 0) + (token.sells24h || 0);
    const avgTxnSize = totalTxns > 0 ? token.volume24h / totalTxns : 0;

    if (totalTxns > 50 && avgTxnSize < token.mcap * 0.01) {
        // Many small transactions = more organic
        legitScore += LEGIT_SIGNALS.ORGANIC_VOLUME;
        positives.push('Organic volume');
    } else if (totalTxns < 10 && token.volume24h > 10000) {
        // Few transactions but high volume = suspicious
        flags.push('Low txn count');
    }

    // 3. Buy/Sell ratio analysis
    const buyRatio = token.buys24h / Math.max(1, token.buys24h + token.sells24h);

    if (buyRatio >= 0.35 && buyRatio <= 0.75) {
        // Healthy two-way trading
        legitScore += LEGIT_SIGNALS.GOOD_BUY_SELL_RATIO;
        positives.push('Balanced trading');
    } else if (buyRatio > 0.9) {
        // Almost all buys = potential setup for dump
        flags.push('One-sided buys');
    } else if (buyRatio < 0.2) {
        // Heavy selling
        flags.push('Heavy selling');
    }

    // 4. MC/Liquidity ratio check
    const mcLiqRatio = token.liquidity > 0 ? token.mcap / token.liquidity : Infinity;

    if (mcLiqRatio < 50) {
        legitScore += LEGIT_SIGNALS.REASONABLE_MCAP;
        positives.push('Good liquidity ratio');
    } else if (mcLiqRatio > 200) {
        flags.push('Low liquidity');
    }

    // 5. Age-appropriate metrics
    if (token.ageHours < 6) {
        // Very fresh - check for early healthy signs
        if (token.volume1h > 500 && token.buys1h > 5) {
            legitScore += 15;
            positives.push('Active first hours');
        }
    } else if (token.ageHours < 24) {
        // Day old - should have established some traction
        if (token.volume24h > 5000 && totalTxns > 100) {
            legitScore += LEGIT_SIGNALS.GROWING_HOLDERS;
            positives.push('Growing traction');
        }
    }

    // 6. Price action health
    if (token.priceChange1h > -30 && token.priceChange1h < 100) {
        // Not dumping, not suspicious pump
        legitScore += 10;
    } else if (token.priceChange1h < -50) {
        flags.push('Dumping');
    } else if (token.priceChange1h > 200) {
        flags.push('Extreme pump');
    }

    // 7. PumpFun native bonus
    if (token.isPumpFun) {
        legitScore += 5;
        positives.push('PumpFun native');
    }

    // 8. Boosted/Profile bonus (team invested in marketing)
    if (token.isBoosted) {
        legitScore += 10;
        positives.push('DEX boosted');
    }
    if (token.hasProfile) {
        legitScore += 5;
        positives.push('Has profile');
    }

    // Cap score at 100
    legitScore = Math.min(100, Math.max(0, legitScore));

    // Determine verdict
    let verdict = 'RISKY';
    if (legitScore >= 70) verdict = 'LEGIT';
    else if (legitScore >= 50) verdict = 'WATCH';
    else if (legitScore >= 30) verdict = 'CAUTION';

    return {
        ...token,
        legitScore,
        verdict,
        flags,
        positives,
        analysis: {
            buyRatio: Math.round(buyRatio * 100),
            mcLiqRatio: Math.round(mcLiqRatio),
            avgTxnSize: Math.round(avgTxnSize),
            totalTxns
        }
    };
}
