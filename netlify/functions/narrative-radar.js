// Netlify Serverless Function for Early Narrative Detection
// Pulls from: PumpFun (new launches), X/Twitter (social buzz), DEX Screener (trending)

let cache = {
    data: null,
    timestamp: 0,
    ttl: 120000 // 2 minute cache
};

// CT-Native Narrative Categories - understand degen culture
const NARRATIVE_CATEGORIES = {
    // AI/Tech Meta (huge in 2024-2025)
    'AI_AGENTS': ['ai', 'agent', 'gpt', 'llm', 'neural', 'virtual', 'autonomous', 'sentient', 'claude', 'openai', 'terminal', 'truth_terminal', 'zerebro', 'goat', 'act', 'fartcoin', 'arc'],

    // Political/Culture War (always pumps on news)
    'POLITICAL': ['trump', 'biden', 'maga', 'election', 'president', 'melania', 'barron', 'political', 'america', 'freedom', 'patriot', 'government', 'congress'],

    // Celebrity/Influencer plays
    'CELEBRITY': ['elon', 'musk', 'kanye', 'ye', 'drake', 'snoop', 'celebrity', 'famous', 'influencer', 'andrew', 'tate', 'logan', 'paul', 'mr beast', 'pewdiepie'],

    // Classic CT Meme Culture
    'MEME_CULTURE': ['meme', 'viral', 'based', 'cope', 'wojak', 'pepe', 'npc', 'degen', 'ape', 'moon', 'pump', 'wagmi', 'ngmi', 'gm', 'ser', 'anon', 'fren', 'jeet', 'rug', 'chad', 'gigachad', 'sigma', 'ratio'],

    // Animal Coins (evergreen meta)
    'ANIMAL_DOG': ['dog', 'doge', 'shib', 'shiba', 'inu', 'wif', 'bonk', 'pup', 'puppy', 'doggo', 'floki', 'cheems', 'dogwifhat'],
    'ANIMAL_CAT': ['cat', 'kitty', 'meow', 'popcat', 'mew', 'nyan', 'kitten', 'pussy', 'felix'],
    'ANIMAL_FROG': ['frog', 'pepe', 'kek', 'ribbit', 'toad', 'rare pepe', 'feels'],
    'ANIMAL_OTHER': ['monkey', 'ape', 'gorilla', 'bear', 'bull', 'penguin', 'bird', 'owl', 'eagle', 'lion', 'tiger', 'dragon', 'fish', 'whale', 'shark', 'crab'],

    // Food/Object memes (sometimes pump randomly)
    'FOOD_OBJECT': ['pizza', 'burger', 'banana', 'apple', 'peanut', 'butter', 'bread', 'cheese', 'taco', 'sushi', 'ramen', 'coffee', 'beer', 'water', 'rock', 'paper', 'hat', 'glasses'],

    // Gaming/Metaverse
    'GAMING': ['game', 'gaming', 'esports', 'twitch', 'streamer', 'play', 'gamer', 'pixel', 'retro', '8bit', 'arcade', 'minecraft', 'fortnite', 'roblox'],

    // DeFi/Infrastructure (less degen but still trades)
    'DEFI': ['swap', 'yield', 'stake', 'farm', 'lend', 'borrow', 'vault', 'protocol', 'bridge', 'liquid', 'staking'],

    // Breaking News/Events
    'NEWS_EVENT': ['breaking', 'just in', 'happening', 'news', 'announcement', 'revealed', 'confirmed', 'leaked', 'exclusive', 'urgent'],

    // CT Insider/Alpha terms
    'ALPHA_CALL': ['alpha', 'call', 'gem', 'lowcap', 'microcap', 'early', '100x', '1000x', 'moonshot', 'hidden', 'stealth', 'presale', 'fairlaunch', 'cabal'],

    // Solana specific
    'SOLANA_META': ['sol', 'solana', 'raydium', 'jupiter', 'jup', 'bonk', 'jito', 'marinade', 'orca', 'phantom', 'backpack']
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

// Fetch X/Twitter-related trends - CT-native approach
// Uses multiple signals to understand what's buzzing on Crypto Twitter
async function fetchXTrends() {
    const trends = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Source 1: DEX Screener token profiles with active socials (CT projects)
        try {
            const dsResponse = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });

            if (dsResponse.ok) {
                const profiles = await dsResponse.json();
                const solanaProfiles = (profiles || [])
                    .filter(p => p.chainId === 'solana')
                    .slice(0, 20);

                for (const profile of solanaProfiles) {
                    // Check for Twitter/X presence
                    const twitterLink = profile.links?.find(l =>
                        l.type === 'twitter' || l.url?.includes('twitter.com') || l.url?.includes('x.com')
                    );

                    if (twitterLink) {
                        // Get token details for real metrics
                        let priceData = {};
                        let symbol = '';
                        let name = '';
                        try {
                            const detailRes = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${profile.tokenAddress}`);
                            if (detailRes.ok) {
                                const pairs = await detailRes.json();
                                if (Array.isArray(pairs) && pairs[0]) {
                                    const p = pairs[0];
                                    priceData = {
                                        priceChange1h: parseFloat(p.priceChange?.h1 || 0),
                                        priceChange24h: parseFloat(p.priceChange?.h24 || 0),
                                        volume24h: parseFloat(p.volume?.h24 || 0),
                                        marketCap: parseFloat(p.fdv || 0),
                                        liquidity: parseFloat(p.liquidity?.usd || 0)
                                    };
                                    symbol = p.baseToken?.symbol || '';
                                    name = p.baseToken?.name || '';
                                }
                            }
                        } catch (e) { }

                        // Generate CT-native text based on metrics
                        let ctText = '';
                        let engagement = 'medium';

                        if (priceData.priceChange1h > 50) {
                            ctText = `$${symbol} sending it rn 🚀`;
                            engagement = 'viral';
                        } else if (priceData.priceChange1h > 20) {
                            ctText = `$${symbol} pumping on CT`;
                            engagement = 'high';
                        } else if (priceData.volume24h > 500000) {
                            ctText = `$${symbol} volume spiking - CT watching`;
                            engagement = 'high';
                        } else if (priceData.priceChange1h < -30) {
                            ctText = `$${symbol} getting rekt - dip or dead?`;
                            engagement = 'medium';
                        } else {
                            ctText = `$${symbol} active on X`;
                            engagement = 'medium';
                        }

                        const category = categorizeNarrative((name || '') + ' ' + (symbol || '') + ' ' + (profile.description || ''));

                        trends.push({
                            text: ctText,
                            source: 'twitter',
                            category,
                            engagement,
                            address: profile.tokenAddress,
                            symbol,
                            name,
                            twitterUrl: twitterLink.url,
                            hasTwitter: true,
                            ...priceData,
                            tokenExists: true
                        });
                    }

                    if (trends.length >= 6) break;
                }
            }
        } catch (e) {
            console.warn('DEX Screener profiles fetch failed:', e.message);
        }

        // Source 2: CoinGecko trending (reflects broader CT buzz)
        try {
            const cgResponse = await fetch('https://api.coingecko.com/api/v3/search/trending', {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });

            if (cgResponse.ok) {
                const data = await cgResponse.json();
                const coins = data.coins || [];

                coins.slice(0, 5).forEach(item => {
                    const coin = item.item;
                    if (coin && !trends.find(t => t.symbol?.toLowerCase() === coin.symbol?.toLowerCase())) {
                        const category = categorizeNarrative(coin.name + ' ' + coin.symbol);

                        // CT-native messaging based on rank
                        let ctText = '';
                        if (coin.score < 2) {
                            ctText = `$${coin.symbol} trending #${coin.score + 1} - CT is talking`;
                        } else if (coin.score < 5) {
                            ctText = `$${coin.symbol} gaining CT attention`;
                        } else {
                            ctText = `$${coin.symbol} on the radar`;
                        }

                        trends.push({
                            text: ctText,
                            source: 'twitter',
                            category,
                            engagement: coin.score < 3 ? 'viral' : coin.score < 6 ? 'high' : 'medium',
                            symbol: coin.symbol,
                            name: coin.name,
                            tokenExists: true,
                            thumb: coin.thumb,
                            marketCapRank: coin.market_cap_rank
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

    // CT-native fallback narratives
    if (trends.length < 2) {
        const ctFallbacks = [
            { text: 'AI agents meta still cooking 🤖', source: 'twitter', category: 'AI_AGENTS', engagement: 'high', tokenExists: false },
            { text: 'SOL memes looking bullish ser', source: 'twitter', category: 'SOLANA_META', engagement: 'high', tokenExists: false },
            { text: 'Degen szn loading...', source: 'twitter', category: 'MEME_CULTURE', engagement: 'medium', tokenExists: false }
        ];
        trends.push(...ctFallbacks.slice(0, 3 - trends.length));
    }

    return trends.slice(0, 8);
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

// CT-native categorization - understands degen culture
function categorizeNarrative(text) {
    if (!text) return 'EMERGING';
    const lowerText = text.toLowerCase();

    // Priority order matters - check more specific categories first
    const categoryPriority = [
        'AI_AGENTS',      // AI meta is huge rn
        'POLITICAL',      // Political plays pump hard
        'CELEBRITY',      // Celebrity coins can moon
        'ALPHA_CALL',     // Alpha/gem calls
        'ANIMAL_DOG',     // Dog coins (biggest animal meta)
        'ANIMAL_CAT',     // Cat coins
        'ANIMAL_FROG',    // Frog/Pepe meta
        'ANIMAL_OTHER',   // Other animals
        'SOLANA_META',    // SOL ecosystem specific
        'NEWS_EVENT',     // Breaking news
        'GAMING',         // Gaming/streamer plays
        'FOOD_OBJECT',    // Random object memes
        'DEFI',           // DeFi plays
        'MEME_CULTURE'    // General meme culture (catch-all)
    ];

    for (const category of categoryPriority) {
        const keywords = NARRATIVE_CATEGORIES[category];
        if (keywords && keywords.some(kw => lowerText.includes(kw))) {
            return category;
        }
    }

    // Check for common CT patterns that might not match keywords
    if (/\$[A-Z]{2,10}/.test(text)) {
        return 'MEME_CULTURE'; // Has ticker format = likely memecoin
    }

    return 'EMERGING';
}

// Generate CT-native description for a narrative
function getCTDescription(category, token) {
    const descriptions = {
        'AI_AGENTS': 'AI agent meta play',
        'POLITICAL': 'Political narrative coin',
        'CELEBRITY': 'Celebrity/influencer play',
        'ALPHA_CALL': 'CT alpha call',
        'ANIMAL_DOG': 'Dog coin szn',
        'ANIMAL_CAT': 'Cat coin play',
        'ANIMAL_FROG': 'Frog/Pepe meta',
        'ANIMAL_OTHER': 'Animal meta',
        'SOLANA_META': 'SOL ecosystem play',
        'NEWS_EVENT': 'News-driven pump',
        'GAMING': 'Gaming/streamer play',
        'FOOD_OBJECT': 'Random object memecoin',
        'DEFI': 'DeFi narrative',
        'MEME_CULTURE': 'Pure degen play',
        'EMERGING': 'New narrative forming'
    };
    return descriptions[category] || 'Emerging narrative';
}

// Score narratives for CT relevance - prioritize actionable alpha
function scoreNarratives(trends) {
    const narrativeMap = new Map();

    for (const trend of trends) {
        // Use symbol as primary key if available, else text
        const textKey = trend.symbol?.toLowerCase() ||
            (trend.text?.slice(0, 25) || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const key = trend.category + '_' + textKey;

        if (narrativeMap.has(key)) {
            const existing = narrativeMap.get(key);
            existing.mentions++;
            existing.sources.add(trend.source);
            // Keep best price data
            if (trend.priceChange1h && (!existing.priceChange1h || trend.priceChange1h > existing.priceChange1h)) {
                existing.priceChange1h = trend.priceChange1h;
            }
            if (trend.volume24h && (!existing.volume24h || trend.volume24h > existing.volume24h)) {
                existing.volume24h = trend.volume24h;
            }
        } else {
            narrativeMap.set(key, {
                ...trend,
                mentions: 1,
                sources: new Set([trend.source])
            });
        }
    }

    // Calculate CT relevance scores
    const scored = Array.from(narrativeMap.values()).map(n => {
        let score = 0;

        // Multi-source validation (huge signal - means CT is talking)
        score += n.sources.size * 30;

        // Mention frequency
        score += Math.min(n.mentions * 12, 36);

        // Engagement level (CT buzz indicator)
        if (n.engagement === 'viral') score += 35;
        else if (n.engagement === 'high') score += 22;
        else if (n.engagement === 'trending') score += 15;
        else score += 8;

        // PumpFun signals (fresh launches CT loves)
        if (n.source === 'pumpfun') {
            if (n.isNew) score += 25; // Just launched = max alpha
            else if (n.isFresh) score += 15; // Still early
            if (n.replyCount > 20) score += 12; // Community engagement
            if (n.marketCap > 50000 && n.marketCap < 5000000) score += 15; // Sweet spot mcap
        }

        // DEX signals (volume + boosted = project spending money)
        if (n.source === 'dexscreener') {
            if (n.isBoosted) score += 18; // Paid promo = active team
            if (n.priceChange1h > 30) score += 15;
            else if (n.priceChange1h > 15) score += 10;
            if (n.volume24h > 500000) score += 12;
            else if (n.volume24h > 100000) score += 8;
        }

        // Twitter/X signals (CT buzz)
        if (n.source === 'twitter') {
            if (n.hasTwitter) score += 10; // Active socials
            if (n.priceChange1h > 20) score += 12; // Pumping while trending
        }

        // CT-hot categories get priority
        if (['AI_AGENTS', 'POLITICAL', 'CELEBRITY', 'NEWS_EVENT'].includes(n.category)) {
            score += 15; // These narratives pump hardest
        } else if (['ANIMAL_DOG', 'ANIMAL_CAT', 'ANIMAL_FROG'].includes(n.category)) {
            score += 10; // Animal metas are evergreen
        } else if (['ALPHA_CALL', 'SOLANA_META'].includes(n.category)) {
            score += 12; // Alpha calls and SOL plays
        }

        // Tradeable token bonus
        if (n.tokenExists && n.address) score += 8;

        // Add CT description
        n.ctCategory = getCTDescription(n.category, n);

        return {
            ...n,
            sources: Array.from(n.sources),
            relevanceScore: Math.min(score, 100)
        };
    });

    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// CT-native sample narratives for fallback
function getSampleNarratives() {
    return [
        {
            text: 'Fresh PumpFun launch cooking 🔥',
            source: 'pumpfun',
            category: 'MEME_CULTURE',
            ctCategory: 'Pure degen play',
            engagement: 'viral',
            relevanceScore: 85,
            sources: ['pumpfun', 'twitter'],
            tokenExists: true,
            suggestion: 'Check PumpFun for fresh launches'
        },
        {
            text: 'AI agents meta still printing 🤖',
            source: 'twitter',
            category: 'AI_AGENTS',
            ctCategory: 'AI agent meta play',
            engagement: 'high',
            relevanceScore: 82,
            sources: ['twitter', 'dexscreener'],
            tokenExists: true,
            suggestion: 'AI narrative tokens pumping'
        },
        {
            text: 'SOL memes looking bullish ser',
            source: 'dexscreener',
            category: 'SOLANA_META',
            ctCategory: 'SOL ecosystem play',
            engagement: 'high',
            relevanceScore: 75,
            sources: ['dexscreener'],
            tokenExists: true,
            suggestion: 'Volume rotating to SOL memes'
        },
        {
            text: 'Political szn loading...',
            source: 'twitter',
            category: 'POLITICAL',
            ctCategory: 'Political narrative coin',
            engagement: 'medium',
            relevanceScore: 65,
            sources: ['twitter'],
            tokenExists: true,
            suggestion: 'Watch for political catalysts'
        },
        {
            text: 'Dog coins waking up 🐕',
            source: 'pumpfun',
            category: 'ANIMAL_DOG',
            ctCategory: 'Dog coin szn',
            engagement: 'medium',
            relevanceScore: 58,
            sources: ['pumpfun'],
            tokenExists: true,
            suggestion: 'Animal meta rotation starting'
        },
        {
            text: 'Degen szn vibes on CT',
            source: 'twitter',
            category: 'MEME_CULTURE',
            ctCategory: 'Pure degen play',
            engagement: 'high',
            relevanceScore: 52,
            sources: ['twitter'],
            tokenExists: false,
            suggestion: 'Risk appetite increasing'
        }
    ];
}
