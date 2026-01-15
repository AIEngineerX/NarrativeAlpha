/**
 * NarrativeAlpha Configuration
 *
 * This file contains configuration settings for the application.
 * API keys should be entered through the UI and are stored in localStorage.
 */

const CONFIG = {
    // Application Info
    APP_NAME: 'NarrativeAlpha',
    APP_VERSION: '1.0.0',
    APP_TAGLINE: 'Find the pump before it pumps',

    // API Settings
    API: {
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com/v1',
        DEFAULT_MODEL: 'claude-sonnet-4-20250514',
        MAX_TOKENS: 1500
    },

    // UI Settings
    UI: {
        ANIMATION_DURATION: 2000,
        DEBOUNCE_DELAY: 300,
        NOTIFICATION_TIMEOUT: 3000
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

    // Sample narratives for display
    SAMPLE_NARRATIVES: [
        {
            type: 'bullish',
            title: 'AI Agent Infrastructure narrative gaining momentum',
            time: '2m ago',
            confidence: 78,
            velocity: '3.2x'
        },
        {
            type: 'bullish',
            title: 'New memecoin meta emerging around viral TikTok trend',
            time: '15m ago',
            confidence: 65,
            velocity: '2.1x'
        },
        {
            type: 'neutral',
            title: 'DePIN sector showing early rotation signals',
            time: '32m ago',
            confidence: 52,
            velocity: '1.5x'
        },
        {
            type: 'bullish',
            title: 'CT influencers coordinating on new narrative play',
            time: '1h ago',
            confidence: 71,
            velocity: '2.8x'
        }
    ],

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
            label: 'Velocity Spikes',
            query: 'What memecoin narratives are showing velocity spikes right now?'
        },
        {
            label: '100x Plays',
            query: 'Identify potential 100x narrative plays in the next 48 hours'
        }
    ]
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
