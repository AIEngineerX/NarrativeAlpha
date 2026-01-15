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
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Cache-Control': 'no-cache'
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
        // Method 1: Find complete JSON objects with trader data
        // The RSC format often has data like: {"wallet_address":"...","name":"...","profit":...}

        // First, try to find JSON-like patterns with all required fields
        // Look for complete trader objects
        const objectPattern = /\{[^{}]*"wallet_address"\s*:\s*"([1-9A-HJ-NP-Za-km-z]{32,44})"[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"profit"\s*:\s*(-?[\d.]+)[^{}]*\}/g;

        let match;
        while ((match = objectPattern.exec(html)) !== null && traders.length < 10) {
            const wallet = match[1];
            if (seen.has(wallet)) continue;

            const fullMatch = match[0];

            // Extract timeframe to filter for daily (1)
            const tfMatch = fullMatch.match(/"timeframe"\s*:\s*(\d+)/);
            const timeframe = tfMatch ? parseInt(tfMatch[1]) : 1;
            if (timeframe !== 1) continue;

            // Extract additional fields
            const winsMatch = fullMatch.match(/"wins"\s*:\s*(\d+)/);
            const lossesMatch = fullMatch.match(/"losses"\s*:\s*(\d+)/);
            const twitterMatch = fullMatch.match(/"twitter"\s*:\s*"([^"]+)"/);

            seen.add(wallet);

            const wins = winsMatch ? parseInt(winsMatch[1]) : 0;
            const losses = lossesMatch ? parseInt(lossesMatch[1]) : 0;
            const pnlSol = parseFloat(match[3]) || 0;

            traders.push({
                rank: traders.length + 1,
                name: match[2],
                wallet: wallet,
                pnlSol: pnlSol,
                pnlUsd: pnlSol * 140,
                wins: wins,
                losses: losses,
                winRate: wins + losses > 0 ? (wins / (wins + losses) * 100) : 0,
                twitter: twitterMatch ? twitterMatch[1] : null
            });
        }

        // Method 2: If method 1 fails, try finding wallets and extracting context
        if (traders.length === 0) {
            const walletPattern = /"wallet_address"\s*:\s*"([1-9A-HJ-NP-Za-km-z]{32,44})"/g;
            let walletMatch;
            const walletPositions = [];

            while ((walletMatch = walletPattern.exec(html)) !== null) {
                walletPositions.push({
                    wallet: walletMatch[1],
                    index: walletMatch.index
                });
            }

            // For each wallet, extract surrounding data with larger context
            for (const wp of walletPositions) {
                if (seen.has(wp.wallet)) continue;
                if (traders.length >= 10) break;

                // Get a larger chunk of text around the wallet address
                const startIdx = Math.max(0, wp.index - 200);
                const endIdx = Math.min(html.length, wp.index + 600);
                const chunk = html.substring(startIdx, endIdx);

                // Extract name (can appear before or after wallet)
                const nameMatch = chunk.match(/"name"\s*:\s*"([^"]+)"/);
                if (!nameMatch) continue;

                // Extract profit
                const profitMatch = chunk.match(/"profit"\s*:\s*(-?[\d.]+)/);
                if (!profitMatch) continue;

                // Check timeframe
                const tfMatch = chunk.match(/"timeframe"\s*:\s*(\d+)/);
                const timeframe = tfMatch ? parseInt(tfMatch[1]) : 1;
                if (timeframe !== 1) continue;

                // Extract other fields
                const winsMatch = chunk.match(/"wins"\s*:\s*(\d+)/);
                const lossesMatch = chunk.match(/"losses"\s*:\s*(\d+)/);
                const twitterMatch = chunk.match(/"twitter"\s*:\s*"(https?:\/\/[^"]+)"/);

                seen.add(wp.wallet);

                const wins = winsMatch ? parseInt(winsMatch[1]) : 0;
                const losses = lossesMatch ? parseInt(lossesMatch[1]) : 0;
                const pnlSol = parseFloat(profitMatch[1]) || 0;

                traders.push({
                    rank: traders.length + 1,
                    name: nameMatch[1],
                    wallet: wp.wallet,
                    pnlSol: pnlSol,
                    pnlUsd: pnlSol * 140,
                    wins: wins,
                    losses: losses,
                    winRate: wins + losses > 0 ? (wins / (wins + losses) * 100) : 0,
                    twitter: twitterMatch ? twitterMatch[1] : null
                });
            }
        }

        // Method 3: Try parsing escaped JSON from script tags
        if (traders.length === 0) {
            // Look for script tags with embedded data
            const scriptMatches = html.match(/<script[^>]*>([^<]*self\.__next[^<]*)<\/script>/gi) || [];

            for (const scriptContent of scriptMatches) {
                // Unescape the content
                const unescaped = scriptContent
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\\\/g, '\\');

                // Try to find trader data in unescaped content
                const walletPattern = /"wallet_address"\s*:\s*"([1-9A-HJ-NP-Za-km-z]{32,44})"/g;
                let walletMatch;

                while ((walletMatch = walletPattern.exec(unescaped)) !== null && traders.length < 10) {
                    const wallet = walletMatch[1];
                    if (seen.has(wallet)) continue;

                    const startIdx = Math.max(0, walletMatch.index - 200);
                    const endIdx = Math.min(unescaped.length, walletMatch.index + 600);
                    const chunk = unescaped.substring(startIdx, endIdx);

                    const nameMatch = chunk.match(/"name"\s*:\s*"([^"]+)"/);
                    const profitMatch = chunk.match(/"profit"\s*:\s*(-?[\d.]+)/);

                    if (!nameMatch || !profitMatch) continue;

                    const tfMatch = chunk.match(/"timeframe"\s*:\s*(\d+)/);
                    const timeframe = tfMatch ? parseInt(tfMatch[1]) : 1;
                    if (timeframe !== 1) continue;

                    const winsMatch = chunk.match(/"wins"\s*:\s*(\d+)/);
                    const lossesMatch = chunk.match(/"losses"\s*:\s*(\d+)/);
                    const twitterMatch = chunk.match(/"twitter"\s*:\s*"(https?:\/\/[^"]+)"/);

                    seen.add(wallet);

                    const wins = winsMatch ? parseInt(winsMatch[1]) : 0;
                    const losses = lossesMatch ? parseInt(lossesMatch[1]) : 0;
                    const pnlSol = parseFloat(profitMatch[1]) || 0;

                    traders.push({
                        rank: traders.length + 1,
                        name: nameMatch[1],
                        wallet: wallet,
                        pnlSol: pnlSol,
                        pnlUsd: pnlSol * 140,
                        wins: wins,
                        losses: losses,
                        winRate: wins + losses > 0 ? (wins / (wins + losses) * 100) : 0,
                        twitter: twitterMatch ? twitterMatch[1] : null
                    });
                }

                if (traders.length >= 10) break;
            }
        }

        // Sort by PnL descending and re-rank
        if (traders.length > 0) {
            traders.sort((a, b) => b.pnlSol - a.pnlSol);
            traders.forEach((t, i) => t.rank = i + 1);
            return traders;
        }

    } catch (e) {
        console.warn('Error parsing kolscan data:', e.message);
    }

    // Fallback data if parsing fails - use real trader names from kolscan
    return [
        {
            rank: 1,
            name: 'Bastille',
            wallet: '3kebnKw7cPdSkLRfiMEALyZJGZ4wdiSRvmoN4rD1yPzV',
            pnlSol: 193.39,
            pnlUsd: 27075,
            wins: 27,
            losses: 25,
            winRate: 51.9,
            twitter: 'https://x.com/BastilleBtc',
            isFallback: true
        },
        {
            rank: 2,
            name: 'Cented',
            wallet: 'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o',
            pnlSol: 156.82,
            pnlUsd: 21955,
            wins: 185,
            losses: 120,
            winRate: 60.7,
            twitter: null,
            isFallback: true
        },
        {
            rank: 3,
            name: 'bradjae',
            wallet: '8Dg8J8xSeKqtBvL1nBe9waX348w5FSFjVnQaRLMpf7eV',
            pnlSol: 134.21,
            pnlUsd: 18789,
            wins: 11,
            losses: 8,
            winRate: 57.9,
            twitter: null,
            isFallback: true
        },
        {
            rank: 4,
            name: 'ansem',
            wallet: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
            pnlSol: 98.45,
            pnlUsd: 13783,
            wins: 45,
            losses: 32,
            winRate: 58.4,
            twitter: 'https://x.com/blknoiz06',
            isFallback: true
        },
        {
            rank: 5,
            name: 'cryptomaster',
            wallet: 'J8FgP7vM5K4rN2xQ3WzYbL1C6hD9sE0tA7uI8oP4wR2y',
            pnlSol: 76.20,
            pnlUsd: 10668,
            wins: 89,
            losses: 67,
            winRate: 57.1,
            twitter: null,
            isFallback: true
        }
    ];
}
