// Netlify Serverless Function for KOL (Key Opinion Leader) Tracking
// Fetches top memecoin trader data from kolscan.io

// Cache to avoid excessive requests
let cache = {
    data: null,
    timestamp: 0,
    ttl: 180000 // 3 minute cache
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
        // Fetch the kolscan.io leaderboard page
        const response = await fetch('https://kolscan.io/leaderboard', {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        // Parse the embedded JSON data from Next.js RSC payload
        const traders = parseKolscanData(html);

        const result = {
            traders: traders,
            lastUpdated: new Date().toISOString(),
            source: 'kolscan.io',
            parsed: traders.length > 0 && !traders[0].isFallback
        };

        // Update cache
        cache.data = result;
        cache.timestamp = now;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=180'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('KOL tracker function error:', error);

        // Return cached data if available, even if stale
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
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch KOL data' })
        };
    }
};

// Parse trader data from kolscan.io HTML (Next.js RSC format)
function parseKolscanData(html) {
    const traders = [];
    const seen = new Set();

    try {
        // Method 1: Extract individual trader objects with flexible field ordering
        // The format is: {"wallet_address":"...","name":"...","telegram":...,"twitter":"...","profit":...,"wins":...,"losses":...,"timeframe":...}

        // Find all wallet addresses first
        const walletPattern = /"wallet_address"\s*:\s*"([1-9A-HJ-NP-Za-km-z]{32,44})"/g;
        let walletMatch;
        const walletPositions = [];

        while ((walletMatch = walletPattern.exec(html)) !== null) {
            walletPositions.push({
                wallet: walletMatch[1],
                index: walletMatch.index
            });
        }

        // For each wallet, extract the surrounding object data
        for (const wp of walletPositions) {
            if (seen.has(wp.wallet)) continue;

            // Get a chunk of text around the wallet address to parse
            const startIdx = Math.max(0, wp.index - 50);
            const endIdx = Math.min(html.length, wp.index + 500);
            const chunk = html.substring(startIdx, endIdx);

            // Extract name
            const nameMatch = chunk.match(/"name"\s*:\s*"([^"]+)"/);
            if (!nameMatch) continue;

            // Extract profit (floating point)
            const profitMatch = chunk.match(/"profit"\s*:\s*(-?[\d.]+)/);
            if (!profitMatch) continue;

            // Extract wins
            const winsMatch = chunk.match(/"wins"\s*:\s*(\d+)/);

            // Extract losses
            const lossesMatch = chunk.match(/"losses"\s*:\s*(\d+)/);

            // Extract timeframe - we want daily (timeframe: 1)
            const timeframeMatch = chunk.match(/"timeframe"\s*:\s*(\d+)/);
            const timeframe = timeframeMatch ? parseInt(timeframeMatch[1]) : 1;

            // Only take daily timeframe entries (timeframe: 1)
            if (timeframe !== 1) continue;

            // Extract twitter if available
            const twitterMatch = chunk.match(/"twitter"\s*:\s*"([^"]+)"/);

            seen.add(wp.wallet);

            const wins = winsMatch ? parseInt(winsMatch[1]) : 0;
            const losses = lossesMatch ? parseInt(lossesMatch[1]) : 0;
            const pnlSol = parseFloat(profitMatch[1]) || 0;

            traders.push({
                rank: traders.length + 1,
                name: nameMatch[1],
                wallet: wp.wallet,
                pnlSol: pnlSol,
                pnlUsd: pnlSol * 140, // Approximate SOL price
                wins: wins,
                losses: losses,
                winRate: wins + losses > 0 ? (wins / (wins + losses) * 100) : 0,
                twitter: twitterMatch ? twitterMatch[1] : null
            });

            // Limit to 10 traders
            if (traders.length >= 10) break;
        }

        // Sort by PnL descending
        if (traders.length > 0) {
            traders.sort((a, b) => b.pnlSol - a.pnlSol);
            traders.forEach((t, i) => t.rank = i + 1);
            return traders;
        }

    } catch (e) {
        console.warn('Error parsing kolscan data:', e.message);
    }

    // Fallback data if parsing fails
    return [
        {
            rank: 1,
            name: 'Bastille',
            wallet: '3kebnKw7cPdSkLRfiMEALyZJGZ4wdiSRvmoN4rD1yPzV',
            pnlSol: 222.92,
            pnlUsd: 31507.60,
            wins: 22,
            losses: 24,
            winRate: 47.8,
            twitter: null,
            isFallback: true
        },
        {
            rank: 2,
            name: 'Cented',
            wallet: 'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o',
            pnlSol: 191.73,
            pnlUsd: 27099.20,
            wins: 174,
            losses: 113,
            winRate: 60.6,
            twitter: null,
            isFallback: true
        },
        {
            rank: 3,
            name: 'bradjae',
            wallet: '8Dg8J8xSeKqtBvL1nBe9waX348w5FSFjVnQaRLMpf7eV',
            pnlSol: 145.51,
            pnlUsd: 20566.30,
            wins: 9,
            losses: 9,
            winRate: 50.0,
            twitter: null,
            isFallback: true
        },
        {
            rank: 4,
            name: 'whale_hunter',
            wallet: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
            pnlSol: 98.45,
            pnlUsd: 13883.50,
            wins: 45,
            losses: 32,
            winRate: 58.4,
            twitter: null,
            isFallback: true
        },
        {
            rank: 5,
            name: 'degen_master',
            wallet: 'J8FgP7vM5K4rN2xQ3WzYbL1C6hD9sE0tA7uI8oP4wR2y',
            pnlSol: 76.20,
            pnlUsd: 10744.20,
            wins: 89,
            losses: 67,
            winRate: 57.1,
            twitter: null,
            isFallback: true
        }
    ];
}
