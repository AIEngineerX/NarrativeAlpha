/**
 * NarrativeAlpha Configuration
 *
 * This file contains configuration settings for the application.
 * API keys should be entered through the UI and are stored in localStorage.
 */

const CONFIG = {
    // Application Info
    APP_NAME: 'NarrativeAlpha',
    APP_VERSION: '2.0.0',
    APP_TAGLINE: 'Find the pump before it pumps',

    // API Settings
    API: {
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com/v1',
        DEFAULT_MODEL: 'claude-sonnet-4-20250514',
        MAX_TOKENS: 1500,
        // DEX Screener API (no key required for public endpoints)
        DEX_SCREENER_BASE: 'https://api.dexscreener.com/latest/dex',
        // Birdeye API (optional - requires API key for advanced features)
        BIRDEYE_BASE: 'https://public-api.birdeye.so',
        // Solscan API
        SOLSCAN_BASE: 'https://public-api.solscan.io'
    },

    // Live Data Settings
    LIVE_DATA: {
        REFRESH_INTERVAL: 30000, // 30 seconds
        MAX_SIGNALS: 50,
        ENABLE_WEBSOCKET: false, // Future: WebSocket support for real-time
        DEFAULT_CHAIN: 'solana'
    },

    // UI Settings
    UI: {
        ANIMATION_DURATION: 2000,
        DEBOUNCE_DELAY: 300,
        NOTIFICATION_TIMEOUT: 3000,
        CHART_HEIGHT: 450,
        CHART_TIMEFRAMES: ['5m', '15m', '1h', '4h', '1d']
    },

    // Network Background Settings
    NETWORK: {
        PARTICLE_COUNT: 80,
        CONNECTION_DISTANCE: 150,
        PARTICLE_SPEED_MAX: 0.8,
        MOUSE_RADIUS: 150
    },

    // Alert Level Thresholds
    ALERTS: {
        LOW: { min: 0, max: 40 },
        MEDIUM: { min: 40, max: 60 },
        HIGH: { min: 60, max: 80 },
        URGENT: { min: 80, max: 100 }
    },

    // Signal Classification Thresholds
    SIGNAL_THRESHOLDS: {
        BULLISH: {
            minPriceChange: 10,
            minVolume: 50000
        },
        URGENT: {
            minPriceChange: 50,
            minVolume: 500000
        },
        BEARISH: {
            maxPriceChange: -10
        }
    },

    // Confidence Calculation Weights
    CONFIDENCE_WEIGHTS: {
        LIQUIDITY_HIGH: { threshold: 100000, bonus: 20 },
        LIQUIDITY_MEDIUM: { threshold: 50000, bonus: 10 },
        VOLUME_HIGH: { threshold: 100000, bonus: 15 },
        VOLUME_MEDIUM: { threshold: 50000, bonus: 8 },
        MCAP_BONUS: { threshold: 1000000, bonus: 10 },
        MAX_CONFIDENCE: 95
    },

    // Dead Token & Scam Detection Thresholds
    VALIDATION: {
        MIN_VOLUME_1H: 1000,          // Min $1k 1h volume for PUMPING tag
        MIN_TXNS_1H: 10,              // Min transactions in last hour
        MIN_CONFIDENCE: 40,           // Min confidence for positive tags
        DEAD_VOLUME_THRESHOLD: 500,   // Below this = DEAD token
        DEAD_TXNS_THRESHOLD: 5,       // Below this txns/hour = DEAD
        MCAP_LIQ_WARNING: 50,         // MC/Liq ratio warning threshold
        MCAP_LIQ_CRITICAL: 100,       // MC/Liq ratio critical threshold
        HONEYPOT_BUY_RATIO: 0.95,     // Above this with no price move = honeypot
        SCAM_SCORE_FILTER: 70,        // Score above this = filter from feed
        SCAM_SCORE_HIGH_RISK: 40      // Score above this = high risk badge
    },

    // Query suggestions
    QUERY_HINTS: [
        {
            label: 'CT Narratives',
            query: "What's the next major pump.fun narrative brewing on CT?"
        },
        {
            label: 'AI Crypto',
            query: 'Analyze AI x Crypto convergence plays and emerging tokens'
        },
        {
            label: 'Hot Movers',
            query: 'What memecoins are showing strong momentum right now?'
        },
    ],

    // External Links Templates
    EXTERNAL_LINKS: {
        DEX_SCREENER: 'https://dexscreener.com/solana/',
        BIRDEYE: 'https://birdeye.so/token/',
        SOLSCAN: 'https://solscan.io/token/',
        PUMP_FUN: 'https://pump.fun/'
    }
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.API);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.NETWORK);
Object.freeze(CONFIG.ALERTS);

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
