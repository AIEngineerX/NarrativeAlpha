// Netlify Serverless Function for Early Narrative Detection
// Aggregates emerging trends from X/Twitter and TikTok before tokens exist

let cache = {
    data: null,
    timestamp: 0,
    ttl: 300000 // 5 minute cache
};

// Crypto-related keywords to filter for
const CRYPTO_KEYWORDS = [
    'crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'memecoin', 'meme coin',
    'nft', 'web3', 'defi', 'degen', 'ape', 'moon', 'pump', 'token', 'airdrop', 'presale',
    'ai agent', 'artificial intelligence', 'gpt', 'chatgpt', 'elon', 'musk', 'trump',
    'doge', 'pepe', 'wojak', 'frog', 'dog coin', 'cat coin', 'animal coin',
    'metaverse', 'gaming', 'play to earn', 'p2e', 'gamefi',
    'viral', 'trending', 'breaking', 'just in'
];

// Narrative categories for classification
const NARRATIVE_CATEGORIES = {
    'AI_TECH': ['ai', 'artificial intelligence', 'gpt', 'chatgpt', 'agent', 'bot', 'llm', 'machine learning'],
    'POLITICAL': ['trump', 'biden', 'election', 'politics', 'government', 'congress', 'senate', 'vote'],
    'CELEBRITY': ['elon', 'musk', 'kanye', 'drake', 'celebrity', 'famous', 'influencer'],
    'MEME_CULTURE': ['meme', 'viral', 'funny', 'lol', 'based', 'cope', 'wojak', 'pepe', 'npc'],
    'ANIMAL': ['dog', 'cat', 'frog', 'shiba', 'doge', 'pepe', 'animal', 'pet'],
    'GAMING': ['game', 'gaming', 'esports', 'twitch', 'streamer', 'play'],
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
        // Fetch from multiple sources in parallel
        const [twitterTrends, tiktokTrends, redditBuzz] = await Promise.all([
            fetchTwitterTrends(),
            fetchTikTokTrends(),
            fetchRedditBuzz()
        ]);

        // Combine and deduplicate trends
        const allTrends = [
            ...twitterTrends,
            ...tiktokTrends,
            ...redditBuzz
        ];

        // Score and rank narratives
        const scoredNarratives = scoreNarratives(allTrends);

        // Get emerging narratives (high engagement, crypto-adjacent)
        const emergingNarratives = scoredNarratives
            .filter(n => n.relevanceScore > 30)
            .slice(0, 12);

        const result = {
            narratives: emergingNarratives,
            lastUpdated: new Date().toISOString(),
            sources: {
                twitter: twitterTrends.length,
                tiktok: tiktokTrends.length,
                reddit: redditBuzz.length
            }
        };

        cache.data = result;
        cache.timestamp = now;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300'
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

// Fetch trending topics from Twitter/X
async function fetchTwitterTrends() {
    const trends = [];

    try {
        // Method 1: Use Nitter (Twitter frontend) RSS or trends page
        // Nitter instances rotate, try multiple
        const nitterInstances = [
            'https://nitter.net',
            'https://nitter.privacydev.net'
        ];

        for (const instance of nitterInstances) {
            try {
                // Search for crypto-related trending topics
                const searches = ['crypto', 'solana', 'memecoin', 'AI agent'];

                for (const term of searches) {
                    const response = await fetch(`${instance}/search?f=tweets&q=${encodeURIComponent(term)}&since=&until=&near=`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'text/html'
                        },
                        timeout: 5000
                    });

                    if (response.ok) {
                        const html = await response.text();
                        const extracted = extractTwitterTrends(html, term);
                        trends.push(...extracted);
                    }
                }

                if (trends.length > 0) break;
            } catch (e) {
                continue;
            }
        }

        // Method 2: Try Trends24 for global trends
        try {
            const response = await fetch('https://trends24.in/united-states/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 5000
            });

            if (response.ok) {
                const html = await response.text();
                const globalTrends = extractTrends24(html);
                trends.push(...globalTrends);
            }
        } catch (e) {
            // Continue without trends24
        }

    } catch (error) {
        console.warn('Twitter trends fetch failed:', error.message);
    }

    return trends.slice(0, 10);
}

// Extract trends from Nitter HTML
function extractTwitterTrends(html, searchTerm) {
    const trends = [];

    // Look for tweet content patterns
    const tweetPattern = /<div class="tweet-content[^"]*"[^>]*>([^<]+)/gi;
    const matches = html.matchAll(tweetPattern);

    for (const match of matches) {
        const content = match[1].trim();
        if (content.length > 20 && content.length < 280) {
            // Check if crypto-related
            const lowerContent = content.toLowerCase();
            if (CRYPTO_KEYWORDS.some(kw => lowerContent.includes(kw))) {
                trends.push({
                    text: content.slice(0, 100),
                    source: 'twitter',
                    category: categorizeNarrative(content),
                    searchTerm,
                    engagement: estimateEngagement(content)
                });
            }
        }

        if (trends.length >= 5) break;
    }

    return trends;
}

// Extract from Trends24
function extractTrends24(html) {
    const trends = [];

    // Look for trend items
    const trendPattern = /<a[^>]*class="[^"]*trend-link[^"]*"[^>]*>([^<]+)</gi;
    const matches = html.matchAll(trendPattern);

    for (const match of matches) {
        const trend = match[1].trim();
        const lowerTrend = trend.toLowerCase();

        // Only include if crypto-adjacent
        if (CRYPTO_KEYWORDS.some(kw => lowerTrend.includes(kw))) {
            trends.push({
                text: trend,
                source: 'twitter',
                category: categorizeNarrative(trend),
                engagement: 'trending'
            });
        }

        if (trends.length >= 5) break;
    }

    return trends;
}

// Fetch TikTok trends
async function fetchTikTokTrends() {
    const trends = [];

    try {
        // TikTok Creative Center has public trending data
        const response = await fetch('https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 8000
        });

        if (response.ok) {
            const html = await response.text();

            // Extract hashtag trends
            const hashtagPattern = /#([a-zA-Z0-9_]+)/g;
            const matches = html.matchAll(hashtagPattern);
            const seen = new Set();

            for (const match of matches) {
                const hashtag = match[1].toLowerCase();
                if (seen.has(hashtag)) continue;
                seen.add(hashtag);

                // Filter for crypto-adjacent hashtags
                if (CRYPTO_KEYWORDS.some(kw => hashtag.includes(kw.replace(/\s+/g, ''))) ||
                    ['cryptok', 'crypto', 'solana', 'meme', 'viral', 'fyp'].includes(hashtag)) {
                    trends.push({
                        text: `#${hashtag}`,
                        source: 'tiktok',
                        category: categorizeNarrative(hashtag),
                        engagement: 'viral'
                    });
                }

                if (trends.length >= 5) break;
            }
        }
    } catch (error) {
        console.warn('TikTok trends fetch failed:', error.message);
    }

    // Add known crypto TikTok trends if we couldn't fetch
    if (trends.length === 0) {
        trends.push(
            { text: '#cryptok', source: 'tiktok', category: 'CRYPTO', engagement: 'high' },
            { text: '#memecoin', source: 'tiktok', category: 'MEME_CULTURE', engagement: 'high' },
            { text: '#solana', source: 'tiktok', category: 'CRYPTO', engagement: 'medium' }
        );
    }

    return trends;
}

// Fetch Reddit crypto buzz
async function fetchRedditBuzz() {
    const trends = [];

    try {
        // Reddit's public JSON endpoints
        const subreddits = ['cryptocurrency', 'solana', 'CryptoMoonShots'];

        for (const sub of subreddits) {
            try {
                const response = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
                    headers: {
                        'User-Agent': 'NarrativeAlpha/1.0'
                    },
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    const posts = data.data?.children || [];

                    for (const post of posts) {
                        const title = post.data?.title || '';
                        const score = post.data?.score || 0;

                        if (score > 100 && title.length > 10) {
                            trends.push({
                                text: title.slice(0, 100),
                                source: 'reddit',
                                subreddit: sub,
                                category: categorizeNarrative(title),
                                engagement: score > 1000 ? 'viral' : score > 500 ? 'high' : 'medium',
                                score
                            });
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }
    } catch (error) {
        console.warn('Reddit buzz fetch failed:', error.message);
    }

    return trends.slice(0, 5);
}

// Categorize a narrative based on keywords
function categorizeNarrative(text) {
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(NARRATIVE_CATEGORIES)) {
        if (keywords.some(kw => lowerText.includes(kw))) {
            return category;
        }
    }

    return 'EMERGING';
}

// Estimate engagement level from content
function estimateEngagement(content) {
    const indicators = ['🔥', '💰', '🚀', '!!!', 'BREAKING', 'JUST IN', 'viral'];
    const matches = indicators.filter(i => content.includes(i)).length;

    if (matches >= 2) return 'viral';
    if (matches >= 1) return 'high';
    return 'medium';
}

// Score narratives for relevance
function scoreNarratives(trends) {
    const narrativeMap = new Map();

    for (const trend of trends) {
        const key = trend.category + '_' + (trend.text?.slice(0, 20) || '').toLowerCase();

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

        // Multi-platform bonus
        score += n.sources.size * 20;

        // Mention count bonus
        score += Math.min(n.mentions * 10, 30);

        // Engagement bonus
        if (n.engagement === 'viral') score += 30;
        else if (n.engagement === 'high') score += 20;
        else if (n.engagement === 'trending') score += 15;
        else score += 10;

        // Reddit score bonus
        if (n.totalScore > 1000) score += 20;
        else if (n.totalScore > 500) score += 10;

        // Category bonus (some categories are more actionable)
        if (['AI_TECH', 'CELEBRITY', 'POLITICAL', 'NEWS_EVENT'].includes(n.category)) {
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
            text: 'AI agents are taking over crypto',
            source: 'twitter',
            category: 'AI_TECH',
            engagement: 'viral',
            relevanceScore: 85,
            sources: ['twitter', 'reddit'],
            tokenExists: false,
            suggestion: 'Watch for new AI agent token launches'
        },
        {
            text: '#cryptok going viral with Gen Z',
            source: 'tiktok',
            category: 'MEME_CULTURE',
            engagement: 'high',
            relevanceScore: 72,
            sources: ['tiktok'],
            tokenExists: false,
            suggestion: 'TikTok narratives often precede pumps by 24-48h'
        },
        {
            text: 'Political memecoins heating up',
            source: 'twitter',
            category: 'POLITICAL',
            engagement: 'high',
            relevanceScore: 68,
            sources: ['twitter', 'reddit'],
            tokenExists: true,
            suggestion: 'Multiple tokens already exist - find the leader'
        },
        {
            text: 'New animal meta forming',
            source: 'twitter',
            category: 'ANIMAL',
            engagement: 'medium',
            relevanceScore: 55,
            sources: ['twitter'],
            tokenExists: false,
            suggestion: 'Cat coins after dog coins? Watch the rotation'
        },
        {
            text: 'Gaming narratives resurging',
            source: 'reddit',
            category: 'GAMING',
            engagement: 'medium',
            relevanceScore: 48,
            sources: ['reddit'],
            tokenExists: true,
            suggestion: 'GameFi tokens showing signs of life'
        }
    ];
}
