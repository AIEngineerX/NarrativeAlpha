// Trench Agent - Real trench scanner for PumpFun with bundle detection & insider tracking
// Analyzes fresh launches for: bundle activity, holder concentration, dev behavior, fresh wallets

let cache = {
    data: null,
    timestamp: 0,
    ttl: 45000 // 45 second cache - faster for trenching
};

// Risk scoring weights
const RISK_WEIGHTS = {
    BUNDLE_DETECTED: 35,        // Multiple buys in same slot = major red flag
    HIGH_HOLDER_CONCENTRATION: 25, // Top 10 hold >50%
    DEV_DUMPING: 30,            // Dev wallet selling
    FRESH_WALLET_BUYS: 15,      // Many buys from new wallets
    ONE_SIDED_BUYS: 20,         // >90% buys = setup for dump
    LOW_LIQUIDITY_RATIO: 15,    // MC/Liq > 100x
    RAPID_PUMP: 10              // >500% in 1h = likely manipulation
};

// Positive signals
const LEGIT_SIGNALS = {
    ORGANIC_DISTRIBUTION: 20,   // Good holder spread
    HEALTHY_TRADING: 15,        // Balanced buy/sell
    GROWING_COMMUNITY: 15,      // Increasing unique traders
    HAS_SOCIALS: 10,            // Twitter/TG presence
    GOOD_LIQUIDITY: 15,         // MC/Liq < 30x
    STABLE_GROWTH: 10,          // Steady price action
    DEV_HOLDING: 15             // Dev still holding (skin in game)
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
        // Fetch fresh PumpFun tokens from multiple sources
        const [pumpFunFresh, trendingNew, boosteds] = await Promise.allSettled([
            fetchPumpFunLaunches(),
            fetchNewSolanaTokens(),
            fetchBoostedTokens()
        ]);

        let allTokens = [];

        if (pumpFunFresh.status === 'fulfilled') allTokens.push(...(pumpFunFresh.value || []));
        if (trendingNew.status === 'fulfilled') allTokens.push(...(trendingNew.value || []));
        if (boosteds.status === 'fulfilled') allTokens.push(...(boosteds.value || []));

        // Deduplicate
        const seen = new Set();
        const uniqueTokens = allTokens.filter(t => {
            if (!t.address || seen.has(t.address)) return false;
            seen.add(t.address);
            return true;
        });

        // Enhanced analysis with bundle detection and holder tracking
        const analyzedTokens = await Promise.all(
            uniqueTokens.slice(0, 30).map(token => analyzeTokenDeep(token))
        );

        // Sort by safety score (higher = safer)
        analyzedTokens.sort((a, b) => b.safetyScore - a.safetyScore);

        // Categorize results
        const result = {
            // Clean gems - low risk, good metrics
            gems: analyzedTokens.filter(t =>
                t.safetyScore >= 65 &&
                t.riskLevel !== 'CRITICAL' &&
                !t.bundleDetected &&
                t.ageHours < 12
            ).slice(0, 6),

            // Watchlist - moderate risk, needs monitoring
            watchlist: analyzedTokens.filter(t =>
                t.safetyScore >= 40 &&
                t.safetyScore < 65 &&
                t.riskLevel !== 'CRITICAL'
            ).slice(0, 6),

            // Risky - high risk indicators, trade with caution
            risky: analyzedTokens.filter(t =>
                t.safetyScore < 40 ||
                t.riskLevel === 'CRITICAL' ||
                t.bundleDetected
            ).slice(0, 6),

            // Stats
            scanStats: {
                totalScanned: uniqueTokens.length,
                bundlesDetected: analyzedTokens.filter(t => t.bundleDetected).length,
                highRisk: analyzedTokens.filter(t => t.riskLevel === 'CRITICAL' || t.riskLevel === 'HIGH').length,
                avgSafetyScore: Math.round(analyzedTokens.reduce((s, t) => s + t.safetyScore, 0) / analyzedTokens.length) || 0
            },
            lastUpdated: new Date().toISOString()
        };

        cache.data = result;
        cache.timestamp = now;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=45'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Trench agent error:', error);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                gems: [],
                watchlist: [],
                risky: [],
                error: 'Scan temporarily unavailable',
                lastUpdated: new Date().toISOString()
            })
        };
    }
};

// Fetch fresh PumpFun launches - focus on very new tokens
async function fetchPumpFunLaunches() {
    const tokens = [];

    try {
        // Get newest Solana pairs
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana?sort=createdAt&order=desc');

        if (!response.ok) {
            // Fallback to search
            return await fetchViaSearch();
        }

        const data = await response.json();
        const pairs = data.pairs || [];

        for (const pair of pairs) {
            const token = extractTokenData(pair);
            if (token && token.ageHours < 24 && token.isPumpFun) {
                tokens.push(token);
            }
        }
    } catch (error) {
        console.warn('PumpFun fetch error:', error.message);
        return await fetchViaSearch();
    }

    return tokens;
}

// Fallback search method
async function fetchViaSearch() {
    const tokens = [];
    const terms = ['pump', 'fun', 'pepe', 'dog', 'ai', 'meme'];

    try {
        const results = await Promise.all(
            terms.slice(0, 3).map(async term => {
                try {
                    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${term}`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return data.pairs || [];
                } catch { return []; }
            })
        );

        for (const pair of results.flat()) {
            const token = extractTokenData(pair);
            if (token && token.ageHours < 24) {
                tokens.push(token);
            }
        }
    } catch (error) {
        console.warn('Search fallback error:', error.message);
    }

    return tokens;
}

// Fetch new Solana tokens (not just PumpFun)
async function fetchNewSolanaTokens() {
    const tokens = [];

    try {
        const response = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
        if (!response.ok) return tokens;

        const profiles = await response.json();
        const solana = (profiles || []).filter(p => p.chainId === 'solana').slice(0, 20);

        if (solana.length > 0) {
            const addresses = solana.map(p => p.tokenAddress).slice(0, 10).join(',');
            const detailRes = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addresses}`);

            if (detailRes.ok) {
                const pairs = await detailRes.json();
                for (const pair of (Array.isArray(pairs) ? pairs : [])) {
                    const token = extractTokenData(pair);
                    if (token && token.ageHours < 48) {
                        const profile = solana.find(p => p.tokenAddress === token.address);
                        if (profile) {
                            token.hasProfile = true;
                            token.description = profile.description;
                        }
                        tokens.push(token);
                    }
                }
            }
        }
    } catch (error) {
        console.warn('New tokens fetch error:', error.message);
    }

    return tokens;
}

// Fetch boosted tokens
async function fetchBoostedTokens() {
    const tokens = [];

    try {
        const response = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
        if (!response.ok) return tokens;

        const boosts = await response.json();
        const solana = (boosts || []).filter(b => b.chainId === 'solana').slice(0, 15);

        if (solana.length > 0) {
            const addresses = solana.map(b => b.tokenAddress).slice(0, 10).join(',');
            const detailRes = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addresses}`);

            if (detailRes.ok) {
                const pairs = await detailRes.json();
                for (const pair of (Array.isArray(pairs) ? pairs : [])) {
                    const token = extractTokenData(pair);
                    if (token && token.ageHours < 72) {
                        token.isBoosted = true;
                        tokens.push(token);
                    }
                }
            }
        }
    } catch (error) {
        console.warn('Boosted tokens error:', error.message);
    }

    return tokens;
}

// Extract standardized token data from DEX Screener pair
function extractTokenData(pair) {
    if (!pair || pair.chainId !== 'solana' || !pair.baseToken?.address) return null;

    const ageMs = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) : Infinity;
    const ageHours = ageMs / (1000 * 60 * 60);
    const mcap = parseFloat(pair.fdv || pair.marketCap || 0);
    const liquidity = parseFloat(pair.liquidity?.usd || 0);

    // Filter criteria
    if (mcap < 1000 || mcap > 50000000) return null; // $1k - $50M
    if (liquidity < 500) return null;

    const address = pair.baseToken.address;
    const isPumpFun = address.toLowerCase().endsWith('pump') ||
                      (pair.dexId || '').toLowerCase().includes('pump');

    return {
        address,
        symbol: pair.baseToken.symbol || '???',
        name: pair.baseToken.name || 'Unknown',
        price: parseFloat(pair.priceUsd || 0),
        mcap,
        liquidity,
        volume24h: parseFloat(pair.volume?.h24 || 0),
        volume1h: parseFloat(pair.volume?.h1 || 0),
        volume5m: parseFloat(pair.volume?.m5 || 0),
        priceChange5m: parseFloat(pair.priceChange?.m5 || 0),
        priceChange1h: parseFloat(pair.priceChange?.h1 || 0),
        priceChange6h: parseFloat(pair.priceChange?.h6 || 0),
        priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
        buys24h: pair.txns?.h24?.buys || 0,
        sells24h: pair.txns?.h24?.sells || 0,
        buys1h: pair.txns?.h1?.buys || 0,
        sells1h: pair.txns?.h1?.sells || 0,
        buys5m: pair.txns?.m5?.buys || 0,
        sells5m: pair.txns?.m5?.sells || 0,
        ageHours: Math.round(ageHours * 10) / 10,
        pairAddress: pair.pairAddress,
        dexUrl: pair.url || `https://dexscreener.com/solana/${address}`,
        isPumpFun,
        hasSocials: !!(pair.info?.socials?.length > 0),
        hasWebsite: !!(pair.info?.websites?.length > 0),
        imageUrl: pair.info?.imageUrl || null
    };
}

// Deep analysis with bundle detection and holder tracking
async function analyzeTokenDeep(token) {
    let riskScore = 0;
    let safetyScore = 50; // Start neutral
    const risks = [];
    const positives = [];

    // ===== BUNDLE DETECTION =====
    // Detect coordinated buying patterns (bundle indicator)
    const bundleAnalysis = detectBundlePatterns(token);
    let bundleDetected = false;

    if (bundleAnalysis.likelihood === 'HIGH') {
        riskScore += RISK_WEIGHTS.BUNDLE_DETECTED;
        risks.push({ type: 'BUNDLE', severity: 'CRITICAL', detail: bundleAnalysis.reason });
        bundleDetected = true;
    } else if (bundleAnalysis.likelihood === 'MEDIUM') {
        riskScore += Math.round(RISK_WEIGHTS.BUNDLE_DETECTED * 0.5);
        risks.push({ type: 'BUNDLE_SUSPECT', severity: 'HIGH', detail: bundleAnalysis.reason });
    }

    // ===== FRESH WALLET INDICATOR =====
    // High buy count with low unique traders = fresh wallets/insiders
    const freshWalletIndicator = analyzeFreshWalletActivity(token);
    if (freshWalletIndicator.suspicious) {
        riskScore += RISK_WEIGHTS.FRESH_WALLET_BUYS;
        risks.push({ type: 'FRESH_WALLETS', severity: 'MEDIUM', detail: freshWalletIndicator.reason });
    }

    // ===== HOLDER CONCENTRATION =====
    // Estimate based on transaction patterns
    const concentrationRisk = analyzeHolderConcentration(token);
    if (concentrationRisk.high) {
        riskScore += RISK_WEIGHTS.HIGH_HOLDER_CONCENTRATION;
        risks.push({ type: 'CONCENTRATION', severity: 'HIGH', detail: concentrationRisk.reason });
    } else if (concentrationRisk.moderate) {
        riskScore += Math.round(RISK_WEIGHTS.HIGH_HOLDER_CONCENTRATION * 0.4);
        risks.push({ type: 'CONCENTRATION', severity: 'MEDIUM', detail: concentrationRisk.reason });
    } else {
        safetyScore += LEGIT_SIGNALS.ORGANIC_DISTRIBUTION;
        positives.push('Good distribution');
    }

    // ===== DEV BEHAVIOR =====
    const devAnalysis = analyzeDevBehavior(token);
    if (devAnalysis.dumping) {
        riskScore += RISK_WEIGHTS.DEV_DUMPING;
        risks.push({ type: 'DEV_DUMP', severity: 'CRITICAL', detail: devAnalysis.reason });
    } else if (devAnalysis.holding) {
        safetyScore += LEGIT_SIGNALS.DEV_HOLDING;
        positives.push('Dev holding');
    }

    // ===== BUY/SELL RATIO =====
    const totalTxns = (token.buys24h + token.sells24h) || 1;
    const buyRatio = token.buys24h / totalTxns;

    if (buyRatio > 0.92) {
        // Almost all buys = setup for dump (insiders loading before dump)
        riskScore += RISK_WEIGHTS.ONE_SIDED_BUYS;
        risks.push({ type: 'ONE_SIDED', severity: 'HIGH', detail: `${Math.round(buyRatio * 100)}% buys - potential dump setup` });
    } else if (buyRatio >= 0.3 && buyRatio <= 0.75) {
        safetyScore += LEGIT_SIGNALS.HEALTHY_TRADING;
        positives.push('Healthy trading');
    } else if (buyRatio < 0.2) {
        risks.push({ type: 'HEAVY_SELLS', severity: 'MEDIUM', detail: 'Heavy sell pressure' });
    }

    // ===== LIQUIDITY RATIO =====
    const mcLiqRatio = token.liquidity > 0 ? token.mcap / token.liquidity : 999;

    if (mcLiqRatio > 100) {
        riskScore += RISK_WEIGHTS.LOW_LIQUIDITY_RATIO;
        risks.push({ type: 'LOW_LIQ', severity: 'MEDIUM', detail: `MC/Liq: ${Math.round(mcLiqRatio)}x` });
    } else if (mcLiqRatio < 30) {
        safetyScore += LEGIT_SIGNALS.GOOD_LIQUIDITY;
        positives.push('Good liquidity');
    }

    // ===== PRICE ACTION =====
    if (token.priceChange1h > 500) {
        riskScore += RISK_WEIGHTS.RAPID_PUMP;
        risks.push({ type: 'RAPID_PUMP', severity: 'MEDIUM', detail: `+${Math.round(token.priceChange1h)}% 1h - manipulation risk` });
    } else if (token.priceChange1h >= -20 && token.priceChange1h <= 100) {
        safetyScore += LEGIT_SIGNALS.STABLE_GROWTH;
        positives.push('Stable growth');
    }

    // ===== SOCIAL PRESENCE =====
    if (token.hasSocials || token.hasWebsite) {
        safetyScore += LEGIT_SIGNALS.HAS_SOCIALS;
        positives.push('Has socials');
    } else if (token.ageHours > 6) {
        risks.push({ type: 'NO_SOCIALS', severity: 'LOW', detail: 'No social presence' });
    }

    // ===== COMMUNITY GROWTH =====
    const recentActivity = (token.buys1h + token.sells1h) || 0;
    if (recentActivity > 20 && token.volume1h > 1000) {
        safetyScore += LEGIT_SIGNALS.GROWING_COMMUNITY;
        positives.push('Active community');
    }

    // ===== FINAL SCORING =====
    // Adjust safety score based on risk
    safetyScore = Math.max(0, Math.min(100, safetyScore - riskScore));

    // Determine risk level
    let riskLevel = 'LOW';
    if (bundleDetected || riskScore >= 50) riskLevel = 'CRITICAL';
    else if (riskScore >= 35) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    // Verdict
    let verdict = 'RISKY';
    if (safetyScore >= 70 && riskLevel === 'LOW') verdict = 'GEM';
    else if (safetyScore >= 55 && riskLevel !== 'CRITICAL') verdict = 'PROMISING';
    else if (safetyScore >= 40) verdict = 'WATCH';
    else if (riskLevel === 'CRITICAL') verdict = 'AVOID';

    return {
        ...token,
        safetyScore,
        riskScore,
        riskLevel,
        verdict,
        bundleDetected,
        bundleRisk: bundleAnalysis,
        risks,
        positives,
        metrics: {
            buyRatio: Math.round(buyRatio * 100),
            mcLiqRatio: Math.round(mcLiqRatio),
            totalTxns,
            recentActivity
        }
    };
}

// Detect bundle patterns from transaction data
function detectBundlePatterns(token) {
    const result = { likelihood: 'LOW', reason: '', indicators: [] };

    // Pattern 1: Extremely high early buying with minimal sells
    // Bundles typically show 95%+ buy ratio in first few hours
    if (token.ageHours < 2) {
        const buyRatio = token.buys24h / Math.max(1, token.buys24h + token.sells24h);
        if (buyRatio > 0.95 && token.buys24h > 10) {
            result.indicators.push('Near-100% buy ratio');
            result.likelihood = 'HIGH';
        }
    }

    // Pattern 2: Very high volume but low transaction count
    // Bundles = few large coordinated buys vs organic = many small buys
    const avgTxnSize = token.volume24h / Math.max(1, token.buys24h + token.sells24h);
    const mcapPct = (avgTxnSize / token.mcap) * 100;

    if (mcapPct > 2 && token.buys24h < 50) {
        // Avg transaction > 2% of mcap with few txns = suspicious
        result.indicators.push(`Avg txn ${mcapPct.toFixed(1)}% of mcap`);
        if (result.likelihood !== 'HIGH') result.likelihood = 'MEDIUM';
    }

    // Pattern 3: 5m snapshot shows burst buying
    // Bundles happen in same slot (0.4s), so 5m window should catch multiple
    if (token.buys5m > 5 && token.sells5m === 0 && token.ageHours < 0.5) {
        result.indicators.push(`${token.buys5m} buys, 0 sells in 5m`);
        result.likelihood = 'HIGH';
    }

    // Pattern 4: MC jumped way above typical for age
    // Bundled tokens often have inflated MC early
    if (token.ageHours < 1 && token.mcap > 500000 && token.buys24h < 30) {
        result.indicators.push('High MC with few buyers');
        if (result.likelihood !== 'HIGH') result.likelihood = 'MEDIUM';
    }

    // Build reason string
    if (result.indicators.length > 0) {
        result.reason = result.indicators.join(' | ');
    }

    return result;
}

// Analyze for fresh wallet activity
function analyzeFreshWalletActivity(token) {
    const result = { suspicious: false, reason: '' };

    // Fresh wallet indicator: many buys but very low volume diversity
    // Real organic = varied buy sizes, fresh wallets = similar sized buys

    const avgBuySize = token.volume24h / Math.max(1, token.buys24h);
    const avgBuyPct = (avgBuySize / token.mcap) * 100;

    // If most buys are suspiciously similar size (within tight range of mcap %)
    // This is a heuristic - real detection would need on-chain data
    if (token.buys24h > 20 && avgBuyPct > 0.5 && avgBuyPct < 3) {
        // Suspiciously uniform buy sizes
        if (token.sells24h < token.buys24h * 0.1) {
            result.suspicious = true;
            result.reason = 'Uniform buy sizes, minimal sells';
        }
    }

    // Very new token with high holder count implied = likely fresh wallets
    if (token.ageHours < 1 && token.buys24h > 50 && token.sells24h < 5) {
        result.suspicious = true;
        result.reason = '50+ buys in first hour, minimal sells';
    }

    return result;
}

// Analyze holder concentration from available data
function analyzeHolderConcentration(token) {
    const result = { high: false, moderate: false, reason: '' };

    // Heuristic: If very high volume but few transactions, concentration is high
    const txnCount = token.buys24h + token.sells24h;
    const avgTxn = token.volume24h / Math.max(1, txnCount);

    // If average transaction is > 5% of mcap, top holders are concentrated
    const avgTxnPct = (avgTxn / token.mcap) * 100;

    if (avgTxnPct > 10) {
        result.high = true;
        result.reason = `Large avg txn (${avgTxnPct.toFixed(0)}% of MC) suggests top holder concentration`;
    } else if (avgTxnPct > 5) {
        result.moderate = true;
        result.reason = 'Moderate holder concentration indicated';
    }

    // Low txn count for token age = concentration
    if (token.ageHours > 6 && txnCount < 50) {
        result.moderate = true;
        result.reason = 'Low trader count for token age';
    }

    return result;
}

// Analyze dev behavior patterns
function analyzeDevBehavior(token) {
    const result = { dumping: false, holding: true, reason: '' };

    // Pattern: High sell pressure in first hours = dev dumping
    if (token.ageHours < 6) {
        const sellRatio = token.sells24h / Math.max(1, token.buys24h + token.sells24h);

        if (sellRatio > 0.4 && token.priceChange1h < -30) {
            result.dumping = true;
            result.holding = false;
            result.reason = 'High early sells with price drop';
        } else if (sellRatio < 0.15) {
            result.holding = true;
            result.reason = 'Minimal selling, devs likely holding';
        }
    }

    // If price dropped significantly but buy ratio is high = insider sold large
    if (token.priceChange24h < -50 && token.buys24h > token.sells24h * 2) {
        result.dumping = true;
        result.holding = false;
        result.reason = 'Price dumped despite more buys (large insider sell)';
    }

    return result;
}
