/**
 * NarrativeAlpha - AI-Powered Memecoin Narrative Intelligence
 * Main Application Script
 */

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => htmlEntities[char]);
}

/**
 * Validate and sanitize URLs - only allow http/https protocols
 * @param {string} url - The URL to validate
 * @returns {string|null} - The validated URL or null if invalid
 */
function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    // Only allow http and https protocols
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        return trimmed;
    }
    return null;
}

/**
 * Validate Solana address format (base58, 32-44 characters)
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid Solana address format
 */
function isValidSolanaAddress(address) {
    if (!address || typeof address !== 'string') return false;
    // Solana addresses are base58 encoded, typically 32-44 characters
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
}

// ============================================
// NETWORK BACKGROUND ANIMATION
// ============================================

class NetworkBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.animationId = null;

        this.config = {
            particleCount: 80,
            particleColor: 'rgba(0, 240, 255, 0.6)',
            lineColor: 'rgba(0, 240, 255, 0.15)',
            particleRadius: { min: 1, max: 3 },
            speed: { min: 0.2, max: 0.8 },
            connectionDistance: 150,
            pulseSpeed: 0.02
        };

        this.init();
        this.setupEventListeners();
    }

    init() {
        this.resize();
        this.createParticles();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            this.particles = [];
            this.createParticles();
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });

        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    createParticles() {
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * (this.config.particleRadius.max - this.config.particleRadius.min) + this.config.particleRadius.min,
                vx: (Math.random() - 0.5) * this.config.speed.max,
                vy: (Math.random() - 0.5) * this.config.speed.max,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * this.config.pulseSpeed + 0.01
            });
        }
    }

    drawParticle(particle) {
        const pulse = Math.sin(particle.pulse) * 0.5 + 0.5;
        const radius = particle.radius * (1 + pulse * 0.3);
        const alpha = 0.4 + pulse * 0.4;

        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
        this.ctx.fill();

        // Glow effect
        const gradient = this.ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, radius * 3
        );
        gradient.addColorStop(0, `rgba(0, 240, 255, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.connectionDistance) {
                    const opacity = (1 - distance / this.config.connectionDistance) * 0.2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
    }

    updateParticles() {
        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.pulse += particle.pulseSpeed;

            // Boundary check with wrap-around
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;

            // Mouse interaction
            if (this.mouse.x !== null && this.mouse.y !== null) {
                const dx = particle.x - this.mouse.x;
                const dy = particle.y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mouse.radius) {
                    const force = (this.mouse.radius - distance) / this.mouse.radius;
                    particle.vx += (dx / distance) * force * 0.02;
                    particle.vy += (dy / distance) * force * 0.02;
                }
            }

            // Speed limit
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed > this.config.speed.max) {
                particle.vx = (particle.vx / speed) * this.config.speed.max;
                particle.vy = (particle.vy / speed) * this.config.speed.max;
            }
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawConnections();
        this.particles.forEach(p => this.drawParticle(p));
        this.updateParticles();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}


// ============================================
// NARRATIVE ALPHA APPLICATION
// ============================================

class NarrativeAlpha {
    constructor() {
        this.isAnalyzing = false;

        this.elements = {
            queryInput: document.getElementById('queryInput'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            resultsSection: document.getElementById('resultsSection'),
            resultTimestamp: document.getElementById('resultTimestamp'),
            mainPrediction: document.getElementById('mainPrediction'),
            alertLevel: document.getElementById('alertLevel'),
            confidenceValue: document.getElementById('confidenceValue'),
            confidenceRing: document.getElementById('confidenceRing'),
            velocityValue: document.getElementById('velocityValue'),
            velocityFill: document.getElementById('velocityFill'),
            catalysts: document.getElementById('catalysts'),
            tickers: document.getElementById('tickers'),
            risks: document.getElementById('risks'),
            timeline: document.getElementById('timeline'),
            actionable: document.getElementById('actionable'),
            signalsFeed: document.getElementById('signalsFeed')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.animateMetrics();
        // Signals are now populated by LiveDataService with real data
    }

    setupEventListeners() {
        // Analyze button
        this.elements.analyzeBtn.addEventListener('click', () => this.analyze());

        // Enter key in textarea
        this.elements.queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.analyze();
            }
        });

        // Hint tags
        document.querySelectorAll('.hint-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                this.elements.queryInput.value = tag.dataset.query;
                this.elements.queryInput.focus();
            });
        });

        // Top Gainer click - opens DEX Screener for the token
        const topGainerEl = document.getElementById('statsTopGainer');
        if (topGainerEl) {
            topGainerEl.style.cursor = 'pointer';
            topGainerEl.addEventListener('click', () => {
                const address = topGainerEl.dataset.address;
                if (address) {
                    window.open(`https://dexscreener.com/solana/${address}`, '_blank');
                }
            });
        }
    }

    animateMetrics() {
        document.querySelectorAll('.metric-value').forEach(el => {
            const target = parseFloat(el.dataset.value);
            const suffix = el.dataset.suffix || '';
            const duration = 2000;
            const start = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;

                el.textContent = (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        });
    }

    async analyze() {
        const query = this.elements.queryInput.value.trim();

        if (!query) {
            this.elements.queryInput.focus();
            return;
        }

        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.elements.analyzeBtn.classList.add('loading');
        this.elements.analyzeBtn.disabled = true;

        try {
            // Refresh live data before analysis to ensure we have the latest
            if (window.liveDataService) {
                console.log('Refreshing token data for analysis...');
                await window.liveDataService.fetchAllData();
            }

            const response = await this.callAPI(query);
            this.displayResults(response);
        } catch (error) {
            console.error('Analysis error:', error);
            this.displayError(error.message);
        } finally {
            this.isAnalyzing = false;
            this.elements.analyzeBtn.classList.remove('loading');
            this.elements.analyzeBtn.disabled = false;
        }
    }

    async callAPI(query) {
        // Get live token data to provide context for the analysis
        const liveTokens = window.liveDataService?.lastTokens || [];
        const topMovers = liveTokens
            .filter(t => {
                // Must have price data
                if (t.priceChange1h === undefined) return false;
                // Exclude potential scams/honeypots
                const scamScore = t.scamCheck?.scamScore || 0;
                if (scamScore >= 40) return false; // Exclude high risk
                if (t.scamCheck?.isPotentialHoneypot) return false;
                // Exclude dead tokens
                if (t.volume1h < 500 && t.txns1h < 5) return false;
                return true;
            })
            .sort((a, b) => (b.priceChange1h || 0) - (a.priceChange1h || 0))
            .slice(0, 10)
            .map(t => ({
                symbol: t.symbol,
                name: t.name,
                price: t.price,
                priceChange1h: t.priceChange1h,
                priceChange24h: t.priceChange24h,
                volume24h: t.volume24h,
                marketCap: t.marketCap,
                liquidity: t.liquidity
            }));

        // Call the Netlify serverless function
        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                liveData: topMovers.length > 0 ? topMovers : null
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analysis request failed');
        }

        return await response.json();
    }

    displayResults(data) {
        // Show results section
        this.elements.resultsSection.classList.remove('hidden');

        // Scroll to results
        this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update timestamp
        this.elements.resultTimestamp.textContent = new Date().toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }) + ' UTC';

        // Main prediction (escape AI-generated content to prevent XSS)
        this.elements.mainPrediction.innerHTML = `
            <h3 style="color: var(--accent-cyan); margin-bottom: 0.75rem; font-size: 1.25rem;">${escapeHtml(data.narrative_name)}</h3>
            <p>${escapeHtml(data.summary)}</p>
        `;

        // Alert level (use textContent which is safe, validate value)
        const alertLevel = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(data.alert_level)
            ? data.alert_level
            : 'MEDIUM';
        this.elements.alertLevel.textContent = alertLevel;
        this.elements.alertLevel.className = 'card-badge ' + alertLevel.toLowerCase();

        // Confidence gauge (ensure numeric)
        const confidence = Math.min(100, Math.max(0, parseInt(data.confidence) || 50));
        this.animateConfidence(confidence);

        // Velocity (ensure numeric)
        const velocity = Math.min(10, Math.max(0, parseFloat(data.velocity_score) || 1.0));
        this.elements.velocityValue.textContent = velocity.toFixed(1) + 'x';
        const velocityPercent = Math.min((velocity / 10) * 100, 100);
        this.elements.velocityFill.style.width = velocityPercent + '%';

        // Catalysts (escape each item)
        this.elements.catalysts.innerHTML = this.formatList(data.catalysts || []);

        // Tickers (escape each ticker)
        this.elements.tickers.innerHTML = (data.suggested_tickers || [])
            .map(t => `<span class="ticker-tag">$${escapeHtml(t)}</span>`)
            .join('');

        // Risks (escape each item)
        this.elements.risks.innerHTML = this.formatList(data.risk_vectors || []);

        // Timeline (escape AI-generated content)
        this.elements.timeline.innerHTML = `<p>${escapeHtml(data.timeline || 'Analysis in progress...')}</p>`;

        // Actionable intel (escape AI-generated content)
        this.elements.actionable.innerHTML = `<p>${escapeHtml(data.actionable_intel || 'No specific actions recommended at this time.')}</p>`;
    }

    animateConfidence(value) {
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference - (value / 100) * circumference;

        this.elements.confidenceRing.style.strokeDashoffset = offset;

        // Animate the number
        const duration = 1500;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(value * eased);

            this.elements.confidenceValue.textContent = current + '%';

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    formatList(items) {
        if (!items || items.length === 0) {
            return '<p>No data available</p>';
        }
        return '<ul>' + items.map(item => `<li>${escapeHtml(item)}</li>`).join('') + '</ul>';
    }

    displayError(message) {
        this.elements.resultsSection.classList.remove('hidden');
        this.elements.mainPrediction.innerHTML = `
            <div style="color: var(--accent-red);">
                <h3 style="margin-bottom: 0.5rem;">Analysis Error</h3>
                <p>${message}</p>
                <p style="margin-top: 1rem; color: var(--text-muted);">
                    Please try again in a moment.
                </p>
            </div>
        `;

        // Reset other fields
        this.elements.confidenceValue.textContent = '0%';
        this.elements.velocityValue.textContent = '0x';
        this.elements.catalysts.innerHTML = '';
        this.elements.tickers.innerHTML = '';
        this.elements.risks.innerHTML = '';
        this.elements.timeline.innerHTML = '';
        this.elements.actionable.innerHTML = '';
    }
}


// ============================================
// NAVIGATION CONTROLLER
// ============================================

class NavigationController {
    constructor() {
        this.sections = document.querySelectorAll('.page-section');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.docsNavLinks = document.querySelectorAll('.docs-nav-link');
        this.docSections = document.querySelectorAll('.doc-section');
        this.filterBtns = document.querySelectorAll('.filter-btn');

        this.init();
    }

    init() {
        // Main navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateTo(section);
            });
        });

        // Docs navigation
        this.docsNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const doc = link.dataset.doc;
                this.showDoc(doc);
            });
        });

        // Signal filters
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterSignals(btn.dataset.filter);
            });
        });

        // Pulse tabs
        document.querySelectorAll('.pulse-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.pulse-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.pulse-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tabType = tab.dataset.tab;
                const targetId = tabType === 'market' ? 'pulseMarket' :
                                 tabType === 'alpha' ? 'pulseAlpha' : 'pulseSocial';
                document.getElementById(targetId)?.classList.add('active');
            });
        });

        // Volume timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const timeframe = btn.dataset.tf;
                document.getElementById('volumeTimeframe').textContent = timeframe;
                // Trigger data refresh with new timeframe if liveDataService exists
                if (window.liveDataService) {
                    window.liveDataService.currentTimeframe = timeframe;
                    window.liveDataService.updateEcosystemPulse(window.liveDataService.lastTokens || []);
                }
            });
        });

        // Handle hash navigation
        this.handleHash();
        window.addEventListener('hashchange', () => this.handleHash());
    }

    navigateTo(sectionId) {
        // Update nav links
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });

        // Update sections
        this.sections.forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });

        // Update URL hash
        history.pushState(null, '', `#${sectionId}`);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showDoc(docId) {
        // Update docs nav
        this.docsNavLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.doc === docId);
        });

        // Update doc sections
        this.docSections.forEach(section => {
            section.classList.toggle('active', section.id === `doc-${docId}`);
        });
    }

    filterSignals(filter) {
        const cards = document.querySelectorAll('.signal-card');
        cards.forEach(card => {
            const type = card.dataset.type || '';
            const tag = card.dataset.tag || '';
            const address = card.dataset.address || '';
            const ageHours = parseFloat(card.dataset.age || '999');
            const volume = parseFloat(card.dataset.volume || '0');

            let show = false;

            if (filter === 'all') {
                show = true;
            } else if (filter === 'watchlist') {
                // Show only watchlisted tokens
                show = window.liveDataService?.isInWatchlist(address) || false;
            } else if (filter === 'fresh') {
                // Show tokens < 24h old
                show = ageHours < 24;
            } else if (filter === 'bullish') {
                // Show momentum/pumping signals
                show = ['PUMPING', 'MOONING', 'RUNNER', 'NEW PUMP', 'EARLY MOVER', 'VOL SURGE', 'WHALES', 'REVERSAL'].includes(tag) || type === 'bullish';
            } else if (filter === 'bearish') {
                // Show dips and dumps
                show = ['DUMPING', 'DISTRIBUTION', 'SELLING', 'DIP BUY'].includes(tag) || type === 'bearish';
            } else if (filter === 'volume') {
                // Show high volume tokens (> $50k 24h volume)
                show = volume > 50000;
            } else {
                show = type === filter;
            }

            card.style.display = show ? 'block' : 'none';
        });
    }

    handleHash() {
        const hash = window.location.hash.slice(1) || 'terminal';
        if (document.getElementById(hash)) {
            this.navigateTo(hash);
        }
    }
}


// ============================================
// LIVE DATA SERVICE - DEX Screener & PumpFun Integration
// ============================================

class LiveDataService {
    constructor() {
        // Use the correct DEX Screener API endpoints per their docs
        this.dexScreenerBaseUrl = 'https://api.dexscreener.com';
        this.pumpFunApiUrl = 'https://frontend-api.pump.fun';
        this.updateInterval = 120000; // 2 minutes - be respectful of rate limits
        this.intervalId = null;
        this.currentTokenAddress = null;
        this.cachedTrendingTokens = [];
        this.cachedPumpFunTokens = [];
        this.lastFetchTime = 0;
        this.lastDexFetchTime = 0;
        this.minFetchInterval = 60000; // Minimum 60s between DEX fetches
        this.retryCount = 0;
        this.maxRetries = 2;
        this.cacheExpiry = 120000; // Cache valid for 2 minutes

        // Ecosystem volumes from CoinGecko
        this.bonkEcosystemVolume = 0;
        this.bagsEcosystemVolume = 0;
        this.bonkEcosystemTokens = 0;
        this.bagsEcosystemTokens = 0;

        // Watchlist - stored in localStorage
        this.watchlist = this.loadWatchlist();

        // Sound Alerts
        this.soundEnabled = localStorage.getItem('na_sound_enabled') !== 'false';
        this.lastAlertTime = 0;
        this.alertSound = null;
        this.initAlertSound();

        this.elements = {
            signalsFeed: document.getElementById('signalsFeed'),
            lastUpdateTime: document.getElementById('lastUpdateTime'),
            trendingTokensList: document.getElementById('trendingTokensList'),
            tokenSearchInput: document.getElementById('tokenSearchInput'),
            searchTokenBtn: document.getElementById('searchTokenBtn'),
            tokenOverview: document.getElementById('tokenOverview'),
            chartEmbed: document.getElementById('chartEmbed')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWatchlistUI();
        this.setupSoundAlertUI();
        // Load data
        this.fetchAllData();
        this.fetchSocialTrends();
        this.fetchNarrativeRadar(); // Fetch emerging narratives (faster refresh)
        this.fetchTrenchAgent(); // Fetch fresh PumpFun launches
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Token search
        if (this.elements.searchTokenBtn) {
            this.elements.searchTokenBtn.addEventListener('click', () => {
                this.searchToken();
            });
        }

        if (this.elements.tokenSearchInput) {
            this.elements.tokenSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.searchToken();
                }
            });
        }

        // Timeframe buttons
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.currentTokenAddress) {
                    this.updateChartEmbed(this.currentTokenAddress);
                }
            });
        });

        // Copy address button
        const copyBtn = document.getElementById('copyAddressBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyAddress());
        }
    }

    startAutoRefresh() {
        // Full data refresh every 2 minutes
        this.intervalId = setInterval(() => {
            this.fetchAllData();
        }, this.updateInterval);

        // Faster metrics refresh every 30 seconds using cached data
        this.metricsIntervalId = setInterval(() => {
            if (this.cachedTrendingTokens.length > 0) {
                this.updateSystemStats(this.cachedTrendingTokens);
            }
        }, 30000);

        // Social trends refresh every 5 minutes
        this.socialTrendsIntervalId = setInterval(() => {
            this.fetchSocialTrends();
        }, 300000);

        // Narrative Radar refresh every 2 minutes (faster for early alpha)
        this.narrativeIntervalId = setInterval(() => {
            this.fetchNarrativeRadar();
        }, 120000);

        // Trench Agent refresh every 90 seconds (fast for fresh launches)
        this.trenchIntervalId = setInterval(() => {
            this.fetchTrenchAgent();
        }, 90000);
    }

    stopAutoRefresh() {
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.metricsIntervalId) clearInterval(this.metricsIntervalId);
        if (this.socialTrendsIntervalId) clearInterval(this.socialTrendsIntervalId);
        if (this.narrativeIntervalId) clearInterval(this.narrativeIntervalId);
        if (this.trenchIntervalId) clearInterval(this.trenchIntervalId);
    }

    updateLastUpdateTime(fromCache = false) {
        if (this.elements.lastUpdateTime) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            this.elements.lastUpdateTime.textContent = fromCache
                ? `Cached data - Next refresh in ${Math.ceil((this.updateInterval - (Date.now() - this.lastFetchTime)) / 1000)}s`
                : `Updated ${timeStr}`;
        }
    }

    // Main fetch function - fetches from both DEX Screener and PumpFun
    async fetchAllData() {
        // Rate limit protection
        const now = Date.now();
        if (now - this.lastFetchTime < this.minFetchInterval) {
            console.log('Skipping fetch - too soon since last request');
            return;
        }
        this.lastFetchTime = now;

        // Show loading state
        if (this.elements.signalsFeed && this.cachedTrendingTokens.length === 0) {
            this.elements.signalsFeed.innerHTML = `
                <div class="signals-loading">
                    <div class="loading-spinner"></div>
                    <span>Fetching live data...</span>
                </div>
            `;
        }

        // Fetch main data sources in parallel
        const [dexData, pumpFunData] = await Promise.allSettled([
            this.fetchDexScreener(),
            this.fetchPumpFun()
        ]);

        // Fetch ecosystem data in background (for Market Pulse, non-blocking)
        Promise.allSettled([
            this.fetchBonkEcosystem(),
            this.fetchBagsEcosystem()
        ]).then(() => {
            // Update ecosystem pulse with new data when available
            if (this.cachedTrendingTokens.length > 0) {
                this.updateEcosystemPulse(this.cachedTrendingTokens);
            }
        });

        let allTokens = [];

        // Process DEX Screener data
        if (dexData.status === 'fulfilled' && dexData.value) {
            console.log(`[Signals] DEX Screener returned ${dexData.value.length} tokens`);
            allTokens = [...allTokens, ...dexData.value];
            this.retryCount = 0; // Reset retry count on success
        } else {
            console.warn('[Signals] DEX Screener fetch failed:', dexData.reason || 'No data');
        }

        // Process PumpFun data
        if (pumpFunData.status === 'fulfilled' && pumpFunData.value) {
            console.log(`[Signals] PumpFun returned ${pumpFunData.value.length} tokens`);
            this.cachedPumpFunTokens = pumpFunData.value;
            allTokens = [...allTokens, ...pumpFunData.value];
        } else {
            console.warn('[Signals] PumpFun fetch failed:', pumpFunData.reason || 'No data');
        }

        console.log(`[Signals] Total tokens before dedup: ${allTokens.length}`);

        if (allTokens.length > 0) {
            // Deduplicate by address
            const seen = new Set();
            const uniqueTokens = allTokens.filter(t => {
                if (seen.has(t.address)) return false;
                seen.add(t.address);
                return true;
            });

            // Sort by heat score
            uniqueTokens.sort((a, b) => b.heatScore - a.heatScore);

            this.cachedTrendingTokens = uniqueTokens.slice(0, 50);
            this.renderSignalsFeed(this.cachedTrendingTokens);
            this.renderTrendingTokens(this.cachedTrendingTokens.slice(0, 8));
            this.updateLastUpdateTime(false);
        } else if (this.cachedTrendingTokens.length > 0) {
            // Use cached data if fetch failed
            this.renderSignalsFeed(this.cachedTrendingTokens);
            this.updateLastUpdateTime(true); // Show that we're using cached data
        } else {
            // No data at all
            this.handleFetchError();
        }
    }

    // Fetch from DEX Screener - using multiple strategies
    async fetchDexScreener() {
        const now = Date.now();

        // Check if we have valid cached data
        if (this.cachedTrendingTokens.length > 0 && (now - this.lastDexFetchTime) < this.cacheExpiry) {
            console.log('Using cached DEX data');
            return this.cachedTrendingTokens.filter(t => !t.isPumpFunStyle);
        }

        // Rate limit check - don't hit API more than once per minute
        if ((now - this.lastDexFetchTime) < this.minFetchInterval) {
            console.log('Skipping DEX fetch - rate limit protection');
            return this.cachedTrendingTokens.filter(t => !t.isPumpFunStyle);
        }

        try {
            let allPairs = [];

            // Strategy 1: Get latest token profiles (shows trending/boosted - 60 req/min)
            try {
                const profilesResponse = await fetch(`${this.dexScreenerBaseUrl}/token-profiles/latest/v1`);
                if (profilesResponse.ok) {
                    const profiles = await profilesResponse.json();
                    // Get Solana token addresses from profiles
                    const solanaAddresses = (profiles || [])
                        .filter(p => p.chainId === 'solana')
                        .map(p => p.tokenAddress)
                        .slice(0, 20);

                    if (solanaAddresses.length > 0) {
                        // Batch fetch token data (up to 30 at once)
                        const batchResponse = await fetch(
                            `${this.dexScreenerBaseUrl}/tokens/v1/solana/${solanaAddresses.join(',')}`
                        );
                        if (batchResponse.ok) {
                            const batchData = await batchResponse.json();
                            allPairs = [...allPairs, ...(Array.isArray(batchData) ? batchData : [])];
                        }
                    }
                }
            } catch (e) {
                console.warn('Token profiles fetch failed:', e.message);
            }

            // Strategy 2: Search for trending memecoin terms
            const memeTerms = ['pepe', 'doge', 'shib', 'wojak', 'chad', 'mog', 'cat', 'dog', 'ai', 'trump'];
            const randomTerm = memeTerms[Math.floor(Math.random() * memeTerms.length)];

            try {
                const searchResponse = await fetch(
                    `${this.dexScreenerBaseUrl}/latest/dex/search?q=${randomTerm}`,
                    { headers: { 'Accept': 'application/json' } }
                );

                if (searchResponse.status === 429) {
                    console.warn('DEX Screener rate limited');
                    this.updateInterval = Math.min(this.updateInterval * 2, 300000);
                } else if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    const solanaPairs = (searchData.pairs || []).filter(p => p.chainId === 'solana');
                    allPairs = [...allPairs, ...solanaPairs];
                }
            } catch (e) {
                console.warn('Search fetch failed:', e.message);
            }

            // Strategy 3: Get latest boosted tokens (shows paid promotions - can indicate activity)
            try {
                const boostResponse = await fetch(`${this.dexScreenerBaseUrl}/token-boosts/top/v1`);
                if (boostResponse.ok) {
                    const boosts = await boostResponse.json();
                    const solanaBoosts = (boosts || [])
                        .filter(b => b.chainId === 'solana')
                        .map(b => b.tokenAddress)
                        .slice(0, 10);

                    if (solanaBoosts.length > 0) {
                        const boostBatchResponse = await fetch(
                            `${this.dexScreenerBaseUrl}/tokens/v1/solana/${solanaBoosts.join(',')}`
                        );
                        if (boostBatchResponse.ok) {
                            const boostData = await boostBatchResponse.json();
                            allPairs = [...allPairs, ...(Array.isArray(boostData) ? boostData : [])];
                        }
                    }
                }
            } catch (e) {
                console.warn('Boost fetch failed:', e.message);
            }

            this.lastDexFetchTime = now;

            if (allPairs.length > 0) {
                return this.processTokenData(allPairs);
            }

            return this.cachedTrendingTokens.filter(t => !t.isPumpFunStyle);

        } catch (error) {
            console.warn('DEX Screener fetch failed:', error.message);
            return this.cachedTrendingTokens.filter(t => !t.isPumpFunStyle);
        }
    }

    // Fetch from PumpFun via DEX Screener (PumpFun direct API requires auth)
    // We search for pump.fun tokens on DEX Screener instead
    async fetchPumpFun() {
        try {
            // Search for recent pump.fun style tokens
            // These are usually new, low-cap Solana memecoins on Raydium
            const pumpTerms = ['pump', 'fun', 'moon', 'inu', 'elon', 'bonk', 'wif', 'popcat', 'meme'];
            const term = pumpTerms[Math.floor(Math.random() * pumpTerms.length)];

            const response = await fetch(
                `${this.dexScreenerBaseUrl}/latest/dex/search?q=${term}`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Filter for Solana pairs that look like pump.fun tokens
            // (new, low mcap, on Raydium)
            const pumpFunStyle = (data.pairs || []).filter(p => {
                if (p.chainId !== 'solana') return false;
                const mcap = parseFloat(p.fdv || p.marketCap || 0);
                const liquidity = parseFloat(p.liquidity?.usd || 0);
                const ageHours = p.pairCreatedAt
                    ? (Date.now() - p.pairCreatedAt) / (1000 * 60 * 60)
                    : 999;

                // Pump.fun style: new (< 7 days), lower mcap (< $10M), has some liquidity
                return ageHours < 168 && mcap < 10000000 && mcap > 1000 && liquidity > 1000;
            });

            return this.processPumpFunStyleData(pumpFunStyle);

        } catch (error) {
            console.warn('PumpFun-style fetch failed:', error.message);
            return null;
        }
    }

    // Fetch Bonk/LetsBonk ecosystem tokens from DEX Screener
    async fetchBonkEcosystem() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            // Search DEX Screener for letsbonk tokens
            const response = await fetch(
                'https://api.dexscreener.com/latest/dex/search?q=letsbonk',
                {
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                }
            );
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const pairs = data.pairs || [];

            // Filter for Solana pairs - search already filtered for "letsbonk"
            // Check token name, website info, or symbol for bonk/letsbonk
            const bonkPairs = pairs.filter(p => {
                if (p.chainId !== 'solana') return false;
                const name = (p.baseToken?.name || '').toLowerCase();
                const symbol = (p.baseToken?.symbol || '').toLowerCase();
                const websites = p.info?.websites || [];
                const hasLetsBonkSite = websites.some(w => (w.url || '').includes('letsbonk'));
                return name.includes('bonk') || symbol.includes('bonk') || hasLetsBonkSite;
            });

            // Process into our token format and store
            this.bonkTokens = bonkPairs.map(pair => this.processDexPair(pair, 'bonk'));
            console.log(`Bonk ecosystem: ${this.bonkTokens.length} tokens from DEX Screener`);

            return this.bonkTokens;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Bonk ecosystem fetch timed out');
            } else {
                console.warn('Bonk ecosystem fetch failed:', error.message);
            }
            this.bonkTokens = [];
            return [];
        }
    }

    // Fetch Bags.fm ecosystem tokens from DEX Screener
    async fetchBagsEcosystem() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            // Search DEX Screener for bags.fm tokens
            const response = await fetch(
                'https://api.dexscreener.com/latest/dex/search?q=bags.fm',
                {
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                }
            );
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const pairs = data.pairs || [];

            // Filter for Solana pairs - search already filtered for "bags.fm"
            // Check token name for bags.fm reference
            const bagsPairs = pairs.filter(p => {
                if (p.chainId !== 'solana') return false;
                const name = (p.baseToken?.name || '').toLowerCase();
                const symbol = (p.baseToken?.symbol || '').toLowerCase();
                return name.includes('bags') || symbol.includes('bags');
            });

            // Process into our token format and store
            this.bagsTokens = bagsPairs.map(pair => this.processDexPair(pair, 'bags'));
            console.log(`Bags ecosystem: ${this.bagsTokens.length} tokens from DEX Screener`);

            return this.bagsTokens;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Bags ecosystem fetch timed out');
            } else {
                console.warn('Bags ecosystem fetch failed:', error.message);
            }
            this.bagsTokens = [];
            return [];
        }
    }

    // Process a DEX Screener pair into our token format
    processDexPair(pair, platform) {
        const volume24h = parseFloat(pair.volume?.h24 || 0);
        const volume1h = parseFloat(pair.volume?.h1 || volume24h / 24);
        const volume5m = parseFloat(pair.volume?.m5 || volume1h / 12);

        return {
            symbol: pair.baseToken?.symbol || '???',
            name: pair.baseToken?.name || 'Unknown',
            address: pair.baseToken?.address || '',
            price: parseFloat(pair.priceUsd || 0),
            priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
            priceChange1h: parseFloat(pair.priceChange?.h1 || 0),
            priceChange5m: parseFloat(pair.priceChange?.m5 || 0),
            volume24h,
            volume1h,
            volume5m,
            liquidity: parseFloat(pair.liquidity?.usd || 0),
            marketCap: parseFloat(pair.fdv || pair.marketCap || 0),
            dexId: pair.dexId || platform,
            url: pair.url || '',
            platform: platform, // Mark which ecosystem this is from
            txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
            txns1h: (pair.txns?.h1?.buys || 0) + (pair.txns?.h1?.sells || 0),
            createdAt: pair.pairCreatedAt || null
        };
    }

    // Process tokens that match pump.fun style (new, low-cap memecoins)
    processPumpFunStyleData(pairs) {
        return pairs.map(pair => {
            const mcap = parseFloat(pair.fdv || pair.marketCap || 0);
            const volume24h = parseFloat(pair.volume?.h24 || 0);
            const liquidity = parseFloat(pair.liquidity?.usd || 0);
            const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
            const priceChange1h = parseFloat(pair.priceChange?.h1 || 0);
            const priceChange5m = parseFloat(pair.priceChange?.m5 || 0);
            const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
            const buys24h = pair.txns?.h24?.buys || 0;
            const buyRatio = txns24h > 0 ? buys24h / txns24h : 0.5;
            const ageHours = pair.pairCreatedAt
                ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60)
                : 999;

            // Signal type
            let signalType = 'neutral';
            let isUrgent = false;
            if (priceChange1h > 20 && buyRatio > 0.5) {
                signalType = 'bullish';
                if (priceChange5m > 10 || priceChange1h > 50) isUrgent = true;
            } else if (priceChange1h < -20) {
                signalType = 'bearish';
            }

            // Confidence
            let confidence = 40;
            if (liquidity > 50000) confidence += 15;
            else if (liquidity > 20000) confidence += 8;
            if (volume24h > 100000) confidence += 15;
            else if (volume24h > 50000) confidence += 8;
            if (txns24h > 500) confidence += 10;
            if (buyRatio > 0.6) confidence += 5;
            if (ageHours < 24) confidence += 5; // Fresh = interesting
            confidence = Math.min(confidence, 95);

            // Heat score prioritizing fresh pumps
            const heatScore = (
                (Math.abs(priceChange5m) * 8) +
                (Math.abs(priceChange1h) * 4) +
                (volume24h / 5000) +
                (txns24h / 50) +
                (ageHours < 24 ? 40 : ageHours < 72 ? 20 : 0) +
                (isUrgent ? 50 : 0)
            );

            return {
                address: pair.baseToken?.address,
                name: pair.baseToken?.name || 'Unknown',
                symbol: pair.baseToken?.symbol || '???',
                price: parseFloat(pair.priceUsd || 0),
                priceChange24h,
                priceChange6h: parseFloat(pair.priceChange?.h6 || 0),
                priceChange1h,
                priceChange5m,
                volume24h,
                volume6h: parseFloat(pair.volume?.h6 || 0),
                volume1h: parseFloat(pair.volume?.h1 || 0),
                liquidity,
                marketCap: mcap,
                txns24h,
                buyRatio,
                pairAddress: pair.pairAddress,
                dexId: pair.dexId || 'raydium',
                signalType,
                isUrgent,
                confidence,
                velocity: (volume24h / Math.max(liquidity, 1) * 2).toFixed(1),
                heatScore,
                createdAt: pair.pairCreatedAt,
                isPumpFunStyle: ['pumpfun', 'pumpswap'].includes((pair.dexId || '').toLowerCase()) || (pair.url || '').includes('pump.fun') || (pair.baseToken?.address || '').endsWith('pump'),
                ageHours,
                url: pair.url,
                info: pair.info || {}
            };
        }).filter(t => t.address); // Filter out any without addresses
    }

    handleFetchError() {
        this.retryCount++;
        if (this.retryCount <= this.maxRetries) {
            const delay = Math.pow(2, this.retryCount) * 10000; // Exponential backoff
            console.log(`Retrying in ${delay/1000}s (attempt ${this.retryCount}/${this.maxRetries})`);
            setTimeout(() => this.fetchAllData(), delay);
        } else {
            this.renderFallbackSignals();
        }
    }

    processTokenData(pairs) {
        // Filter for Solana pairs and deduplicate by base token
        const seenTokens = new Set();
        const processed = [];

        for (const pair of pairs) {
            if (!pair.baseToken || seenTokens.has(pair.baseToken.address)) continue;

            // Only include Solana tokens
            if (pair.chainId !== 'solana') continue;

            seenTokens.add(pair.baseToken.address);

            const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
            const priceChange6h = parseFloat(pair.priceChange?.h6 || 0);
            const priceChange1h = parseFloat(pair.priceChange?.h1 || 0);
            const priceChange5m = parseFloat(pair.priceChange?.m5 || 0);
            const volume24h = parseFloat(pair.volume?.h24 || 0);
            const volume6h = parseFloat(pair.volume?.h6 || 0);
            const volume1h = parseFloat(pair.volume?.h1 || 0);
            const volume5m = parseFloat(pair.volume?.m5 || 0);
            const liquidity = parseFloat(pair.liquidity?.usd || 0);
            const marketCap = parseFloat(pair.fdv || pair.marketCap || 0);
            const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
            const txns1h = (pair.txns?.h1?.buys || 0) + (pair.txns?.h1?.sells || 0);
            const buyRatio = pair.txns?.h24?.buys && pair.txns?.h24?.sells
                ? pair.txns.h24.buys / (pair.txns.h24.buys + pair.txns.h24.sells)
                : 0.5;

            // Detect PumpFun tokens early (before filtering)
            const dexIdLower = (pair.dexId || '').toLowerCase();
            const ageMs = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) : Infinity;
            const ageHours = ageMs / (1000 * 60 * 60);
            const isPumpFunToken = (
                dexIdLower === 'pumpfun' ||
                dexIdLower === 'pumpswap' ||
                (pair.url || '').toLowerCase().includes('pump.fun') ||
                (pair.baseToken?.address || '').endsWith('pump')
            );

            // MC/Liq ratio check - filter out extremely high ratios (likely manipulation)
            const mcLiqRatio = liquidity > 0 ? marketCap / liquidity : 0;
            if (mcLiqRatio > 500) continue; // Skip tokens with MC 500x+ liquidity

            // Skip tokens with very low liquidity or no volume
            // PumpFun tokens get lighter filtering to show more signals
            if (isPumpFunToken) {
                // Minimal filters for PumpFun - show most tokens
                if (volume24h < 500 && volume1h < 100) continue;
            } else {
                if (liquidity < 1000 || volume24h < 500) continue;
            }

            // Calculate signal type based on metrics
            let signalType = 'neutral';
            let isUrgent = false;

            // Bullish: Price up with good volume and buy pressure
            if (priceChange24h > 10 && volume24h > 50000 && buyRatio > 0.45) {
                signalType = 'bullish';
                // Urgent: Massive moves or very high volume with recent momentum
                if ((priceChange24h > 50 && priceChange1h > 5) || volume24h > 500000 || (priceChange5m > 10 && volume1h > 50000)) {
                    isUrgent = true;
                }
            } else if (priceChange24h < -15 || (priceChange24h < -5 && buyRatio < 0.35)) {
                signalType = 'bearish';
            }

            // Calculate confidence based on multiple factors
            let confidence = 45;

            // Liquidity score (safety)
            if (liquidity > 500000) confidence += 25;
            else if (liquidity > 100000) confidence += 18;
            else if (liquidity > 50000) confidence += 10;

            // Volume score (interest)
            if (volume24h > 500000) confidence += 15;
            else if (volume24h > 100000) confidence += 10;
            else if (volume24h > 50000) confidence += 5;

            // Market cap score (maturity)
            if (marketCap > 10000000) confidence += 10;
            else if (marketCap > 1000000) confidence += 5;

            // Transaction count score (real activity)
            if (txns24h > 5000) confidence += 5;
            else if (txns24h > 1000) confidence += 3;

            // Buy pressure bonus
            if (buyRatio > 0.6) confidence += 5;

            confidence = Math.min(confidence, 95);

            // Calculate velocity (volume/liquidity ratio weighted by recent momentum)
            const baseVelocity = liquidity > 0 ? volume24h / liquidity : 0;
            const momentumMultiplier = priceChange1h > 0 ? 1 + (priceChange1h / 100) : 1;
            const velocity = Math.min(baseVelocity * momentumMultiplier * 2, 10).toFixed(1);

            // Calculate a "heat score" for sorting - prioritizes recent momentum
            const heatScore = (
                (Math.abs(priceChange5m) * 5) +
                (Math.abs(priceChange1h) * 3) +
                (Math.abs(priceChange6h) * 1.5) +
                (volume24h / 10000) +
                (txns24h / 100) +
                (liquidity > 100000 ? 20 : 0) +
                (isUrgent ? 50 : 0)
            );

            // Detect if this is a PumpFun-style token (includes graduated tokens)
            const isPumpFunStyle = (
                isPumpFunToken || // Direct PumpFun listing (detected earlier)
                (dexIdLower === 'raydium' && ageHours < 168 && liquidity < 500000) // Graduated from PumpFun
            );

            const tokenData = {
                address: pair.baseToken.address,
                name: pair.baseToken.name || 'Unknown',
                symbol: pair.baseToken.symbol || '???',
                price: parseFloat(pair.priceUsd || 0),
                priceChange24h,
                priceChange6h,
                priceChange1h,
                priceChange5m,
                volume24h,
                volume6h,
                volume1h,
                volume5m,
                liquidity,
                marketCap,
                txns24h,
                buyRatio,
                pairAddress: pair.pairAddress,
                dexId: pair.dexId,
                isPumpFunStyle,
                ageHours,
                signalType,
                isUrgent,
                confidence,
                velocity,
                heatScore,
                createdAt: pair.pairCreatedAt,
                url: pair.url,
                info: pair.info || {}
            };

            // Run scam detection
            const scamCheck = this.detectScamIndicators(tokenData);

            // Filter obvious scams entirely
            if (scamCheck.shouldFilter) {
                continue;
            }

            // Add scam info to token data
            tokenData.scamCheck = scamCheck;
            tokenData.isHighRisk = scamCheck.isHighRisk;
            tokenData.isPotentialHoneypot = scamCheck.isPotentialHoneypot;

            // Adjust confidence based on scam score - tiered reduction
            if (scamCheck.scamScore >= 60) {
                tokenData.confidence = Math.max(10, tokenData.confidence - 50);
            } else if (scamCheck.scamScore >= 40) {
                tokenData.confidence = Math.max(10, tokenData.confidence - 35);
            } else if (scamCheck.scamScore >= 20) {
                tokenData.confidence = Math.max(10, tokenData.confidence - 20);
            } else if (scamCheck.scamScore > 0) {
                tokenData.confidence = Math.max(10, tokenData.confidence - 10);
            }

            processed.push(tokenData);
        }

        // Sort by heat score (most momentum first) - this prioritizes active pumps
        return processed.sort((a, b) => b.heatScore - a.heatScore).slice(0, 50);
    }

    renderSignalsFeed(tokens) {
        if (!this.elements.signalsFeed) return;

        if (tokens.length === 0) {
            this.renderFallbackSignals();
            return;
        }

        const html = tokens.map(token => this.createSignalCard(token)).join('');
        this.elements.signalsFeed.innerHTML = html;

        // Add click handlers to signal cards (but not on watchlist button)
        this.elements.signalsFeed.querySelectorAll('.signal-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't navigate if clicking watchlist button
                if (e.target.closest('.watchlist-btn')) return;

                const address = card.dataset.address;
                if (address) {
                    this.loadTokenDetails(address);
                    // Navigate to chart section
                    document.querySelector('.nav-link[data-section="chart"]')?.click();
                }
            });
        });

        // Add watchlist button handlers
        this.elements.signalsFeed.querySelectorAll('.watchlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const address = btn.dataset.address;
                const symbol = btn.dataset.symbol;
                const name = btn.dataset.name;

                if (this.isInWatchlist(address)) {
                    this.removeFromWatchlist(address);
                    btn.classList.remove('active');
                    btn.querySelector('svg').setAttribute('fill', 'none');
                    btn.title = 'Add to watchlist';
                } else {
                    this.addToWatchlist({ address, symbol, name });
                    btn.classList.add('active');
                    btn.querySelector('svg').setAttribute('fill', 'currentColor');
                    btn.title = 'Remove from watchlist';
                }
            });
        });

        // Play sound alert if there are urgent signals
        const urgentCount = tokens.filter(t => t.isUrgent).length;
        if (urgentCount > 0 && this.soundEnabled) {
            this.playAlertSound();
        }

        // Update system stats with real data
        this.updateSystemStats(tokens);
    }

    // Update Trading Activity metrics (replaces old System Performance)
    updateSystemStats(tokens) {
        if (!tokens || tokens.length === 0) return;

        // 1. Calculate total 1h volume across all tokens
        const totalVolume1h = tokens.reduce((sum, t) => sum + (t.volume1h || 0), 0);

        // 2. Count hot movers (tokens with >20% 1h gain and real volume)
        const hotMovers = tokens.filter(t => {
            const change = t.priceChange1h ?? 0;
            const volume = t.volume1h || 0;
            return change > 20 && volume > 500;
        }).length;

        // 3. Count urgent signals
        const urgentCount = tokens.filter(t => t.isUrgent === true).length;

        // 4. Find top mover using composite momentum (5m × 0.6 + 1h × 0.4)
        const topGainer = [...tokens]
            .filter(t => {
                // Skip Meteora pairs - often have fake/wash volume
                const dex = (t.dexId || '').toLowerCase();
                if (dex.includes('meteora')) return false;

                // Must have BOTH 5m and 1h data for composite score
                if (t.priceChange5m === undefined || t.priceChange1h === undefined) return false;

                // Both timeframes should be positive (confirmed uptrend)
                if (t.priceChange5m <= 0 || t.priceChange1h <= 0) return false;

                // Require volume activity
                const volume1h = t.volume1h || 0;
                if (volume1h < 5000) return false;

                // Require liquidity
                const liquidity = t.liquidity || 0;
                if (liquidity < 5000) return false;

                // Skip potential scams/honeypots
                const scamScore = t.scamCheck?.scamScore || 0;
                if (scamScore >= 50 || t.scamCheck?.isPotentialHoneypot) return false;

                return true;
            })
            .map(t => ({
                ...t,
                // Composite momentum: recent action weighted more + sustained trend
                momentumScore: (t.priceChange5m * 0.6) + (t.priceChange1h * 0.4)
            }))
            .sort((a, b) => b.momentumScore - a.momentumScore)[0];

        // Update DOM elements
        const volumeEl = document.getElementById('statsTotalVolume');
        const volumeBar = document.getElementById('statsVolumeBar');
        const hotEl = document.getElementById('statsHotMovers');
        const hotBar = document.getElementById('statsHotBar');
        const urgentEl = document.getElementById('statsUrgentCount');
        const urgentBar = document.getElementById('statsUrgentBar');
        const topGainerEl = document.getElementById('statsTopGainer');
        const topGainerChangeEl = document.getElementById('statsTopGainerChange');
        const timeEl = document.getElementById('metricsUpdateTime');

        // Total Volume
        if (volumeEl) {
            volumeEl.textContent = `$${this.formatCompact(totalVolume1h)}`;
        }
        if (volumeBar) {
            const volPercent = Math.min(100, (totalVolume1h / 1000000) * 100);
            volumeBar.style.setProperty('--fill-width', `${volPercent}%`);
        }

        // Hot Movers (tokens with >20% 1h gain)
        if (hotEl) {
            hotEl.textContent = hotMovers;
            hotEl.className = `metric-value ${hotMovers > 5 ? 'positive' : ''}`;
        }
        if (hotBar) {
            // Scale: 10+ hot movers = 100%
            const hotPercent = Math.min(100, (hotMovers / 10) * 100);
            hotBar.style.setProperty('--fill-width', `${hotPercent}%`);
        }

        // Urgent Signals
        if (urgentEl) {
            urgentEl.textContent = urgentCount;
            urgentEl.className = `metric-value ${urgentCount > 0 ? 'urgent-pulse' : ''}`;
        }
        if (urgentBar) {
            const urgentPercent = Math.min(100, (urgentCount / 10) * 100);
            urgentBar.style.setProperty('--fill-width', `${urgentPercent}%`);
        }

        // Top Gainer
        if (topGainerEl && topGainer) {
            topGainerEl.textContent = `$${topGainer.symbol}`;
            topGainerEl.dataset.address = topGainer.address;
        } else if (topGainerEl) {
            topGainerEl.textContent = '---';
        }
        if (topGainerChangeEl && topGainer) {
            // Show both 5m and 1h for full picture
            const change5m = topGainer.priceChange5m ?? 0;
            const change1h = topGainer.priceChange1h ?? 0;
            topGainerChangeEl.textContent = `+${change5m.toFixed(0)}% 5m / +${change1h.toFixed(0)}% 1h`;
            topGainerChangeEl.className = `top-gainer-change positive`;
        }

        // Update timestamp
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
        }

        // Update ecosystem pulse
        this.updateEcosystemPulse(tokens);
    }

    // Update the ecosystem pulse section with market data
    updateEcosystemPulse(tokens) {
        if (!tokens || tokens.length === 0) return;

        // Merge in Bonk and Bags ecosystem tokens (fetched from DEX Screener search)
        const bonkTokens = this.bonkTokens || [];
        const bagsTokens = this.bagsTokens || [];

        // Combine all tokens, avoiding duplicates by address
        const seenAddresses = new Set(tokens.map(t => t.address));
        const allTokens = [...tokens];

        bonkTokens.forEach(t => {
            if (t.address && !seenAddresses.has(t.address)) {
                seenAddresses.add(t.address);
                allTokens.push(t);
            }
        });
        bagsTokens.forEach(t => {
            if (t.address && !seenAddresses.has(t.address)) {
                seenAddresses.add(t.address);
                allTokens.push(t);
            }
        });

        // Store for timeframe refresh
        this.lastTokens = tokens;
        const timeframe = this.currentTimeframe || '24h';

        // Calculate platform breakdown from token data (all from same source for accurate share)
        const platformVolumes = { raydium: 0, pumpfun: 0, meteora: 0, orca: 0 };

        allTokens.forEach(t => {
            const dex = (t.dexId || '').toLowerCase();

            // Use appropriate volume based on timeframe
            let vol;
            if (timeframe === '5m') {
                vol = t.volume5m || (t.volume1h ? t.volume1h / 12 : t.volume24h * 0.003);
            } else if (timeframe === '1h') {
                vol = t.volume1h || (t.volume24h ? t.volume24h / 24 : 0);
            } else {
                vol = t.volume24h || 0;
            }

            // Detect platform from dexId
            if (t.isPumpFunStyle || dex === 'pumpfun' || dex === 'pumpswap') {
                platformVolumes.pumpfun += vol;
            } else if (dex.includes('raydium')) {
                platformVolumes.raydium += vol;
            } else if (dex.includes('meteora')) {
                platformVolumes.meteora += vol;
            } else if (dex.includes('orca')) {
                platformVolumes.orca += vol;
            } else {
                // Default to Raydium for Solana tokens without clear dex
                platformVolumes.raydium += vol;
            }
        });

        // Total volume from all platforms (same data source = accurate share)
        const totalVolume = Object.values(platformVolumes).reduce((a, b) => a + b, 0);


        // CT-Native narrative detection - expanded for degen culture
        const narrativeKeywords = {
            'AI Agents': ['ai', 'gpt', 'agent', 'neural', 'bot', 'llm', 'virtual', 'sentient', 'autonomous', 'terminal', 'zerebro', 'goat', 'arc'],
            'Dog Coins': ['dog', 'doge', 'shib', 'shiba', 'inu', 'wif', 'bonk', 'pup', 'puppy', 'doggo', 'floki', 'cheems', 'dogwifhat'],
            'Cat Coins': ['cat', 'kitty', 'meow', 'nyan', 'popcat', 'mew', 'kitten', 'felix'],
            'Frog Meta': ['frog', 'pepe', 'kek', 'ribbit', 'toad', 'feels'],
            'Political': ['trump', 'biden', 'maga', 'political', 'melania', 'barron', 'america', 'freedom', 'patriot', 'president'],
            'Celebrity': ['elon', 'musk', 'kanye', 'ye', 'drake', 'snoop', 'celebrity', 'famous', 'influencer', 'tate', 'logan', 'paul'],
            'Meme Culture': ['meme', 'wojak', 'chad', 'gigachad', 'sigma', 'based', 'cope', 'seethe', 'npc', 'degen', 'wagmi', 'ngmi', 'ser', 'anon', 'fren'],
            'Gaming': ['game', 'gaming', 'play', 'nft', 'pixel', 'retro', 'gamer', 'twitch', 'streamer'],
            'DeFi': ['swap', 'yield', 'stake', 'farm', 'lend', 'vault', 'protocol', 'bridge'],
            'Food/Object': ['pizza', 'burger', 'banana', 'taco', 'coffee', 'beer', 'rock', 'paper', 'hat'],
            'SOL Meta': ['sol', 'solana', 'raydium', 'jupiter', 'jup', 'jito', 'marinade', 'orca', 'phantom']
        };

        const narrativeCounts = {};
        const narrativeVolumes = {};
        allTokens.forEach(t => {
            const name = ((t.name || '') + ' ' + (t.symbol || '')).toLowerCase();
            // Use volume based on selected timeframe
            const vol = timeframe === '5m' ? (t.volume5m || 0) :
                        timeframe === '1h' ? (t.volume1h || 0) :
                        (t.volume24h || 0);
            for (const [narrative, keywords] of Object.entries(narrativeKeywords)) {
                if (keywords.some(kw => name.includes(kw))) {
                    narrativeCounts[narrative] = (narrativeCounts[narrative] || 0) + 1;
                    narrativeVolumes[narrative] = (narrativeVolumes[narrative] || 0) + vol;
                }
            }
        });

        // Sort narratives by count
        const sortedNarratives = Object.entries(narrativeCounts).sort((a, b) => b[1] - a[1]);

        // Update hot narrative
        const hotNarrative = sortedNarratives[0];
        const hotNarrativeEl = document.getElementById('hotNarrative');
        const hotNarrativeCountEl = document.getElementById('hotNarrativeCount');
        if (hotNarrativeEl && hotNarrative) {
            hotNarrativeEl.textContent = hotNarrative[0];
        }
        if (hotNarrativeCountEl && hotNarrative) {
            hotNarrativeCountEl.textContent = `${hotNarrative[1]} tokens`;
        }

        // Total volume
        const totalVolumeEl = document.getElementById('totalVolume');
        if (totalVolumeEl) {
            totalVolumeEl.textContent = `$${this.formatCompact(totalVolume)}`;
        }

        // New launches based on timeframe (5m/1h/24h)
        const launchWindowHours = timeframe === '5m' ? (5/60) : timeframe === '1h' ? 1 : 24;
        const newLaunchCount = allTokens.filter(t => {
            let ageHours;
            if (t.ageHours !== undefined && t.ageHours !== null) {
                ageHours = t.ageHours;
            } else if (t.createdAt) {
                ageHours = (Date.now() - t.createdAt) / (1000 * 60 * 60);
            } else {
                return false;
            }
            return ageHours < launchWindowHours;
        }).length;
        const newLaunchesEl = document.getElementById('newLaunches');
        if (newLaunchesEl) {
            newLaunchesEl.textContent = newLaunchCount;
        }
        // Update the "last X" label
        const launchMetaEl = newLaunchesEl?.parentElement?.querySelector('.pulse-stat-meta');
        if (launchMetaEl) {
            launchMetaEl.textContent = `last ${timeframe}`;
        }

        // Average market cap
        const avgMcap = allTokens.reduce((sum, t) => sum + (t.marketCap || 0), 0) / allTokens.length;
        const avgMcapEl = document.getElementById('avgMcap');
        if (avgMcapEl) {
            avgMcapEl.textContent = `$${this.formatCompact(avgMcap)}`;
        }

        // Update volume chart with platform breakdown
        this.updateVolumeChart(platformVolumes, totalVolume);

        // Update top gainer
        const topGainer = [...allTokens]
            .filter(t => {
                if (t.priceChange1h === undefined || t.priceChange1h <= 0) return false;
                if ((t.volume1h || 0) < 5000) return false;
                if ((t.liquidity || 0) < 5000) return false;
                const scamScore = t.scamCheck?.scamScore || 0;
                if (scamScore >= 50 || t.scamCheck?.isPotentialHoneypot) return false;
                return true;
            })
            .sort((a, b) => b.priceChange1h - a.priceChange1h)[0];

        const topGainerEl = document.getElementById('topGainer');
        const topGainerChangeEl = document.getElementById('topGainerChange');
        if (topGainerEl && topGainer) {
            topGainerEl.textContent = `$${topGainer.symbol}`;
            if (topGainerChangeEl) {
                topGainerChangeEl.textContent = `+${topGainer.priceChange1h.toFixed(0)}% 1h`;
            }
        } else if (topGainerEl) {
            topGainerEl.textContent = '--';
            if (topGainerChangeEl) topGainerChangeEl.textContent = '--';
        }

        // Update CT Buzz / Social Trends
        this.updateSocialTrends(sortedNarratives, tokens);
    }

    // Update volume list with platform breakdown
    updateVolumeChart(platformVolumes, totalVolume) {
        // Update each platform row
        const updateRow = (id, volume, total) => {
            const volEl = document.getElementById(`${id}Volume`);
            const shareEl = document.getElementById(`${id}Share`);
            const barEl = document.getElementById(`${id}Bar`);

            if (volEl) volEl.textContent = `$${this.formatCompact(volume)}`;

            const pct = total > 0 ? Math.round((volume / total) * 100) : 0;
            if (shareEl) shareEl.textContent = `${pct}%`;
            if (barEl) barEl.style.width = `${Math.max(2, pct)}%`;
        };

        // Calculate Meteora and Orca from 'other' bucket
        const meteora = platformVolumes.meteora || (platformVolumes.other * 0.6) || 0;
        const orca = platformVolumes.orca || (platformVolumes.other * 0.4) || 0;

        updateRow('pumpfun', platformVolumes.pumpfun || 0, totalVolume);
        updateRow('raydium', platformVolumes.raydium || 0, totalVolume);
        updateRow('meteora', meteora, totalVolume);
        updateRow('orca', orca, totalVolume);
    }

    // Update the CT Buzz / Social Trends tab (fallback when social-trends API fails)
    updateSocialTrends(sortedNarratives, tokens) {
        const listEl = document.getElementById('socialTrendsList');
        if (!listEl) return;

        const items = [];

        // Add top mover tokens (scam-filtered)
        const topMovers = [...tokens]
            .filter(t => {
                if (t.priceChange1h <= 10) return false;
                const scamScore = t.scamCheck?.scamScore || 0;
                if (scamScore >= 40 || t.scamCheck?.isPotentialHoneypot) return false;
                return true;
            })
            .sort((a, b) => b.priceChange1h - a.priceChange1h)
            .slice(0, 4);

        topMovers.forEach((t, i) => {
            items.push({
                type: 'token',
                symbol: t.symbol,
                name: t.name,
                change: t.priceChange1h,
                address: t.address,
                source: 'dexscreener',
                hot: i === 0
            });
        });

        // Add top narratives
        sortedNarratives.slice(0, 2).forEach(([narrative, count]) => {
            items.push({
                type: 'narrative',
                name: narrative,
                count: count,
                source: 'detected'
            });
        });

        // Render items
        const html = items.slice(0, 6).map((item, i) => {
            if (item.type === 'token') {
                const changeClass = (item.change || 0) >= 0 ? 'positive' : 'negative';
                const changeText = `${item.change >= 0 ? '+' : ''}${item.change.toFixed(1)}%`;
                const searchUrl = item.address
                    ? `https://dexscreener.com/solana/${item.address}`
                    : `https://dexscreener.com/solana?q=${encodeURIComponent(item.symbol)}`;
                const twitterUrl = `https://twitter.com/search?q=%24${encodeURIComponent(item.symbol)}&src=typed_query&f=live`;

                return `
                    <div class="trend-item ${item.hot ? 'hot' : ''}" data-symbol="${escapeHtml(item.symbol)}">
                        <div class="trend-rank">${i + 1}</div>
                        <div class="trend-info">
                            <span class="trend-symbol">$${escapeHtml(item.symbol)}</span>
                            <span class="trend-name">${escapeHtml(item.name || 'Token')}</span>
                        </div>
                        <span class="trend-change ${changeClass}">${changeText}</span>
                        <div class="trend-actions">
                            <a href="${searchUrl}" target="_blank" rel="noopener" class="trend-link dex" title="View on DEX Screener">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                            </a>
                            <a href="${twitterUrl}" target="_blank" rel="noopener" class="trend-link twitter" title="Search on X/Twitter">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </a>
                        </div>
                        <span class="trend-source dexscreener">DEX</span>
                    </div>
                `;
            } else {
                return `
                    <div class="trend-item narrative">
                        <div class="trend-rank">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M17.56 21a1 1 0 01-.46-.11L12 18.22l-5.1 2.67a1 1 0 01-1.45-1.06l1-5.63-4.12-4a1 1 0 01.56-1.71l5.7-.83 2.51-5.13a1 1 0 011.8 0l2.51 5.13 5.7.83a1 1 0 01.56 1.71l-4.12 4 1 5.63a1 1 0 01-1 1.18z"/></svg>
                        </div>
                        <div class="trend-info">
                            <span class="trend-symbol">${escapeHtml(item.name)}</span>
                            <span class="trend-name">${item.count} tokens</span>
                        </div>
                        <span class="trend-change positive">Trending</span>
                        <span class="trend-source dexscreener">Live</span>
                    </div>
                `;
            }
        }).join('');

        listEl.innerHTML = html || '<div class="trend-item empty">Loading trends...</div>';
    }

    // Fetch real social trends from Netlify function
    async fetchSocialTrends() {
        try {
            const response = await fetch('/.netlify/functions/social-trends');

            if (!response.ok) {
                throw new Error('Social trends fetch failed');
            }

            const data = await response.json();
            this.displaySocialTrends(data);

            return data;
        } catch (error) {
            console.warn('Social trends error:', error);
            // Fall back to token-based trends
            if (this.lastTokens && this.lastTokens.length > 0) {
                this.updateSocialTrends(this.sortedNarratives || [], this.lastTokens);
            }
            return null;
        }
    }

    // Display real social trends in CT Buzz tab
    displaySocialTrends(data) {
        const listEl = document.getElementById('socialTrendsList');
        if (!listEl) return;

        const trends = data.aggregatedTrends || [];
        const categories = data.hotCategories || [];
        const cgTrending = data.coingeckoTrending || [];

        // Build display items
        const items = [];

        // Add CoinGecko trending tokens (most reliable)
        cgTrending.slice(0, 3).forEach((t, i) => {
            items.push({
                type: 'token',
                symbol: t.symbol,
                name: t.name,
                change: t.priceChange24h,
                rank: t.marketCapRank,
                thumb: t.thumb,
                source: 'coingecko',
                hot: i === 0
            });
        });

        // Add DEX Screener trending
        const dexTrending = data.dexScreenerTrending || [];
        dexTrending.slice(0, 2).forEach(t => {
            // Avoid duplicates
            if (!items.find(x => x.symbol === t.symbol)) {
                items.push({
                    type: 'token',
                    symbol: t.symbol,
                    name: t.name,
                    change: t.priceChange24h || t.priceChange1h,
                    volume: t.volume24h,
                    source: 'dexscreener',
                    hot: (t.priceChange1h || 0) > 20
                });
            }
        });

        // Add hot narratives/categories
        categories.slice(0, 2).forEach(cat => {
            items.push({
                type: 'narrative',
                name: cat.name,
                change: cat.change24h,
                volume: cat.volume24h,
                source: 'coingecko'
            });
        });

        // Render items
        const html = items.slice(0, 6).map((item, i) => {
            if (item.type === 'token') {
                const changeClass = (item.change || 0) >= 0 ? 'positive' : 'negative';
                const changeText = item.change !== undefined
                    ? `${item.change >= 0 ? '+' : ''}${item.change.toFixed(1)}%`
                    : `#${item.rank}`;
                const searchUrl = `https://dexscreener.com/solana?q=${encodeURIComponent(item.symbol)}`;
                const twitterUrl = `https://x.com/search?q=%24${encodeURIComponent(item.symbol)}&src=typed_query&f=live`;

                return `
                    <div class="trend-item ${item.hot ? 'hot' : ''}" data-symbol="${escapeHtml(item.symbol)}">
                        <div class="trend-rank">${i + 1}</div>
                        ${item.thumb ? `<img class="trend-thumb" src="${escapeHtml(item.thumb)}" alt="" onerror="this.style.display='none'">` : ''}
                        <div class="trend-info">
                            <span class="trend-symbol">$${escapeHtml(item.symbol)}</span>
                            <span class="trend-name">${escapeHtml(item.name || '')}</span>
                        </div>
                        <span class="trend-change ${changeClass}">${changeText}</span>
                        <div class="trend-actions">
                            <a href="${searchUrl}" target="_blank" rel="noopener" class="trend-link dex" title="View on DEX Screener">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                            </a>
                            <a href="${twitterUrl}" target="_blank" rel="noopener" class="trend-link twitter" title="Search on X/Twitter">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </a>
                        </div>
                        <span class="trend-source ${item.source}">${item.source === 'coingecko' ? 'CG' : 'DEX'}</span>
                    </div>
                `;
            } else {
                // Narrative/category
                const changeClass = (item.change || 0) >= 0 ? 'positive' : 'negative';
                const changeText = item.change ? `${item.change >= 0 ? '+' : ''}${item.change.toFixed(1)}%` : 'Hot';
                const searchUrl = `https://www.coingecko.com/en/categories/${item.name.toLowerCase().replace(/\s+/g, '-')}`;

                return `
                    <div class="trend-item narrative">
                        <div class="trend-rank">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M17.56 21a1 1 0 01-.46-.11L12 18.22l-5.1 2.67a1 1 0 01-1.45-1.06l1-5.63-4.12-4a1 1 0 01.56-1.71l5.7-.83 2.51-5.13a1 1 0 011.8 0l2.51 5.13 5.7.83a1 1 0 01.56 1.71l-4.12 4 1 5.63a1 1 0 01-1 1.18z"/></svg>
                        </div>
                        <div class="trend-info">
                            <span class="trend-symbol">${escapeHtml(item.name)}</span>
                            <span class="trend-name">Narrative</span>
                        </div>
                        <span class="trend-change ${changeClass}">${changeText}</span>
                        <div class="trend-actions">
                            <a href="${searchUrl}" target="_blank" rel="noopener" class="trend-link cg" title="View category">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                            </a>
                        </div>
                        <span class="trend-source coingecko">CG</span>
                    </div>
                `;
            }
        }).join('');

        listEl.innerHTML = html || '<div class="trend-item empty">No trending data available</div>';

        // Update timestamp
        const socialTimeEl = document.getElementById('socialUpdateTime');
        if (socialTimeEl) {
            socialTimeEl.textContent = data.cached ? 'Cached' : 'Live';
        }
    }

    // ============================================
    // NARRATIVE RADAR (EARLY ALPHA)
    // ============================================

    async fetchNarrativeRadar() {
        try {
            const response = await fetch('/.netlify/functions/narrative-radar');

            if (!response.ok) {
                throw new Error('Narrative radar fetch failed');
            }

            const data = await response.json();
            this.displayNarratives(data);

            return data;
        } catch (error) {
            console.warn('Narrative radar error:', error);
            // Display sample data on error
            const listEl = document.getElementById('narrativeList');
            if (listEl) {
                listEl.innerHTML = '<div class="narrative-item empty">Unable to load narrative data</div>';
            }
            return null;
        }
    }

    displayNarratives(data) {
        const listEl = document.getElementById('narrativeList');
        if (!listEl) return;

        const narratives = data.narratives || [];

        if (narratives.length === 0) {
            listEl.innerHTML = '<div class="narrative-item empty">No emerging narratives detected</div>';
            return;
        }

        const html = narratives.slice(0, 8).map((narrative, i) => {
            // Determine category styling
            const categoryClass = (narrative.category || 'EMERGING').toLowerCase().replace('_', '-');
            const categoryLabel = this.formatCategory(narrative.category);

            // Determine engagement level
            const engagementClass = narrative.engagement === 'viral' ? 'viral' :
                                   narrative.engagement === 'high' ? 'high' : 'medium';

            // Source icons
            const sources = narrative.sources || [narrative.source];
            const sourceIcons = sources.map(s => {
                if (s === 'pumpfun') return '<span class="source-icon pumpfun" title="PumpFun">PF</span>';
                if (s === 'twitter') return '<span class="source-icon x" title="X/Twitter">X</span>';
                if (s === 'dexscreener') return '<span class="source-icon dex" title="DEX Screener">DEX</span>';
                return '';
            }).join('');

            // Extract symbol for search - prefer explicit symbol, fallback to parsing from text
            const symbol = narrative.symbol ||
                (narrative.text?.match(/\$([A-Za-z0-9]+)/)?.[1]) ||
                (narrative.text?.split(' - ')[0]?.replace(/^\$/, '')) ||
                narrative.text?.split(' ')[0]?.replace(/[^A-Za-z0-9]/g, '') || '';

            // For X search, use symbol with $ prefix
            const xSymbolSearch = symbol ? `$${symbol}` : narrative.text?.slice(0, 30) || '';

            const mainSource = narrative.source || sources[0];

            // Build URLs
            const dexUrl = narrative.address
                ? `https://dexscreener.com/solana/${narrative.address}`
                : (narrative.dexUrl || `https://dexscreener.com/solana?q=${encodeURIComponent(symbol)}`);
            const xSearchUrl = `https://x.com/search?q=${encodeURIComponent(xSymbolSearch)}&src=typed_query&f=live`;
            const pumpFunUrl = narrative.address
                ? `https://pump.fun/coin/${narrative.address}`
                : 'https://pump.fun/board';

            // Token metrics display
            let metricsHtml = '';
            if (narrative.tokenExists && (narrative.marketCap || narrative.volume24h || narrative.priceChange1h !== undefined)) {
                const mcap = narrative.marketCap ? this.formatCompactNumber(narrative.marketCap) : null;
                const vol = narrative.volume24h ? this.formatCompactNumber(narrative.volume24h) : null;
                const change = narrative.priceChange1h !== undefined ? narrative.priceChange1h : null;

                metricsHtml = '<div class="narrative-metrics">';
                if (mcap) metricsHtml += `<span class="metric-pill mcap">${mcap} MC</span>`;
                if (vol) metricsHtml += `<span class="metric-pill vol">${vol} vol</span>`;
                if (change !== null) {
                    const changeClass = change >= 0 ? 'positive' : 'negative';
                    metricsHtml += `<span class="metric-pill change ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(1)}%</span>`;
                }
                metricsHtml += '</div>';
            }

            // Token status
            const tokenStatus = narrative.tokenExists && narrative.address
                ? `<span class="token-status exists">CA: ${narrative.address.slice(0, 4)}...${narrative.address.slice(-4)}</span>`
                : '<span class="token-status early">Pre-token</span>';

            // Age badge for fresh tokens
            const ageBadge = narrative.ageHours !== undefined && narrative.ageHours < 24
                ? `<span class="age-badge fresh">${narrative.ageHours < 1 ? '<1h' : Math.floor(narrative.ageHours) + 'h'} old</span>`
                : '';

            return `
                <div class="narrative-item ${engagementClass} ${narrative.address ? 'clickable' : ''}"
                     data-category="${categoryClass}"
                     data-source="${mainSource}"
                     data-address="${narrative.address || ''}"
                     data-dex-url="${dexUrl}"
                     title="${narrative.address ? 'Click to open DEX Screener' : ''}">
                    <div class="narrative-rank ${i < 3 ? 'top' : ''}">${i + 1}</div>
                    <div class="narrative-content">
                        <div class="narrative-text">${escapeHtml(narrative.text || '')}</div>
                        <div class="narrative-meta">
                            <span class="narrative-category ${categoryClass}">${categoryLabel}</span>
                            ${ageBadge}
                            ${tokenStatus}
                            <span class="narrative-sources">${sourceIcons}</span>
                        </div>
                        ${metricsHtml}
                    </div>
                    <div class="narrative-actions">
                        <a href="${dexUrl}" target="_blank" rel="noopener" class="narrative-link dex" title="View on DEX Screener">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>
                        </a>
                        ${narrative.address ? `
                        <a href="${pumpFunUrl}" target="_blank" rel="noopener" class="narrative-link pump" title="View on Pump.fun">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><circle cx="12" cy="12" r="10"/><path fill="rgba(0,0,0,0.3)" d="M12 6v12M6 12h12"/></svg>
                        </a>
                        ` : ''}
                        <a href="${xSearchUrl}" target="_blank" rel="noopener" class="narrative-link x" title="Search on X">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        ${narrative.address ? `
                        <button class="narrative-link copy" data-ca="${narrative.address}" title="Copy CA">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        listEl.innerHTML = html;

        // Add click handlers for narrative items with addresses
        listEl.querySelectorAll('.narrative-item.clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.narrative-actions')) return;

                const dexUrl = item.dataset.dexUrl;
                const address = item.dataset.address;

                if (dexUrl) {
                    // Open DEX Screener in new tab
                    window.open(dexUrl, '_blank');
                } else if (address) {
                    // Copy CA to clipboard
                    navigator.clipboard.writeText(address).then(() => {
                        // Show brief feedback
                        item.classList.add('copied');
                        setTimeout(() => item.classList.remove('copied'), 1500);
                    });
                }
            });
        });

        // Add click handlers for copy CA buttons
        listEl.querySelectorAll('.narrative-link.copy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ca = btn.dataset.ca;
                if (ca) {
                    try {
                        await navigator.clipboard.writeText(ca);
                        btn.classList.add('copied');
                        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20,6 9,17 4,12"/></svg>';
                        setTimeout(() => {
                            btn.classList.remove('copied');
                            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
                        }, 1500);
                    } catch (err) {
                        console.error('Copy failed:', err);
                    }
                }
            });
        });

        // Update timestamp
        const alphaTimeEl = document.getElementById('alphaUpdateTime');
        if (alphaTimeEl) {
            if (data.isSample) {
                alphaTimeEl.textContent = 'Sample';
                alphaTimeEl.classList.add('sample-data');
            } else if (data.cached) {
                alphaTimeEl.textContent = 'Cached';
                alphaTimeEl.classList.remove('sample-data');
            } else {
                alphaTimeEl.textContent = 'Live';
                alphaTimeEl.classList.remove('sample-data');
            }
        }
    }

    // ============================================
    // TRENCH AGENT - Fresh PumpFun Scanner
    // ============================================

    async fetchTrenchAgent() {
        try {
            const response = await fetch('/.netlify/functions/trench-agent');

            if (!response.ok) {
                throw new Error('Trench agent fetch failed');
            }

            const data = await response.json();
            this.displayTrenchResults(data);

            return data;
        } catch (error) {
            console.warn('Trench agent error:', error);
            const gemsEl = document.getElementById('trenchGems');
            if (gemsEl) {
                gemsEl.innerHTML = '<div class="trench-item empty">Scanner temporarily unavailable</div>';
            }
            return null;
        }
    }

    displayTrenchResults(data) {
        // Update stats
        const scannedEl = document.getElementById('trenchScanned');
        const passedEl = document.getElementById('trenchPassed');
        const avgScoreEl = document.getElementById('trenchAvgScore');
        const gemsCountEl = document.getElementById('gemsCount');
        const watchCountEl = document.getElementById('watchCount');
        const updateTimeEl = document.getElementById('trenchUpdateTime');

        if (data.scanStats) {
            if (scannedEl) scannedEl.textContent = data.scanStats.totalFound || 0;
            if (passedEl) passedEl.textContent = data.scanStats.passedFilters || 0;
            if (avgScoreEl) avgScoreEl.textContent = data.scanStats.avgLegitScore || 0;
        }

        if (updateTimeEl) {
            updateTimeEl.textContent = data.cached ? 'Cached' : 'Live';
        }

        // Render gems
        const gemsEl = document.getElementById('trenchGems');
        const freshGems = data.freshGems || [];

        if (gemsCountEl) gemsCountEl.textContent = freshGems.length;

        if (gemsEl) {
            if (freshGems.length === 0) {
                gemsEl.innerHTML = '<div class="trench-item empty">No gems found yet - scanning...</div>';
            } else {
                gemsEl.innerHTML = freshGems.map(token => this.renderTrenchItem(token, 'gem')).join('');
                this.attachTrenchClickHandlers(gemsEl);
            }
        }

        // Render watchlist
        const watchEl = document.getElementById('trenchWatch');
        const watchlist = data.watchlist || [];

        if (watchCountEl) watchCountEl.textContent = watchlist.length;

        if (watchEl) {
            if (watchlist.length === 0) {
                watchEl.innerHTML = '<div class="trench-item empty">No watchlist items</div>';
            } else {
                watchEl.innerHTML = watchlist.slice(0, 5).map(token => this.renderTrenchItem(token, 'watch')).join('');
                this.attachTrenchClickHandlers(watchEl);
            }
        }
    }

    renderTrenchItem(token, type) {
        const verdictClass = token.verdict?.toLowerCase() || 'risky';
        const priceChangeClass = token.priceChange1h >= 0 ? 'positive' : 'negative';
        const priceChange = token.priceChange1h >= 0 ? `+${token.priceChange1h.toFixed(1)}%` : `${token.priceChange1h.toFixed(1)}%`;

        const positives = (token.positives || []).slice(0, 3).map(p =>
            `<span class="trench-positive">${escapeHtml(p)}</span>`
        ).join('');

        const flags = (token.flags || []).slice(0, 2).map(f =>
            `<span class="trench-flag">${escapeHtml(f)}</span>`
        ).join('');

        return `
            <div class="trench-item ${type}" data-address="${token.address}" data-dex="${token.dexUrl}">
                <div class="trench-item-main">
                    <div class="trench-token-info">
                        <span class="trench-symbol">$${escapeHtml(token.symbol)}</span>
                        <span class="trench-name">${escapeHtml(token.name?.slice(0, 20) || '')}</span>
                        <span class="trench-age">${token.ageHours < 1 ? '<1h' : Math.floor(token.ageHours) + 'h'}</span>
                    </div>
                    <div class="trench-metrics">
                        <span class="trench-mcap">${this.formatCompactNumber(token.mcap) || '--'}</span>
                        <span class="trench-change ${priceChangeClass}">${priceChange}</span>
                    </div>
                </div>
                <div class="trench-item-details">
                    <div class="trench-score-row">
                        <div class="trench-score-bar">
                            <div class="trench-score-fill ${verdictClass}" style="width: ${token.legitScore}%"></div>
                        </div>
                        <span class="trench-score-value">${token.legitScore}</span>
                        <span class="trench-verdict ${verdictClass}">${token.verdict}</span>
                    </div>
                    <div class="trench-signals">
                        ${positives}
                        ${flags}
                    </div>
                </div>
                <div class="trench-actions">
                    <a href="${token.dexUrl}" target="_blank" class="trench-action dex" title="DEX Screener">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>
                    </a>
                    <button class="trench-action copy" data-ca="${token.address}" title="Copy CA">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                </div>
            </div>
        `;
    }

    attachTrenchClickHandlers(container) {
        // Click on item opens DEX
        container.querySelectorAll('.trench-item[data-dex]').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.trench-actions')) return;
                const dexUrl = item.dataset.dex;
                if (dexUrl) window.open(dexUrl, '_blank');
            });
        });

        // Copy CA button
        container.querySelectorAll('.trench-action.copy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ca = btn.dataset.ca;
                if (ca) {
                    try {
                        await navigator.clipboard.writeText(ca);
                        btn.classList.add('copied');
                        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20,6 9,17 4,12"/></svg>';
                        setTimeout(() => {
                            btn.classList.remove('copied');
                            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
                        }, 1500);
                    } catch (err) {
                        console.error('Copy failed:', err);
                    }
                }
            });
        });
    }

    formatCategory(category) {
        const labels = {
            'AI_TECH': 'AI/Tech',
            'AI_AGENTS': 'AI Agent',
            'POLITICAL': 'Political',
            'CELEBRITY': 'Celebrity',
            'MEME_CULTURE': 'Meme',
            'ANIMAL': 'Animal',
            'ANIMAL_DOG': 'Dog',
            'ANIMAL_CAT': 'Cat',
            'ANIMAL_FROG': 'Frog',
            'ANIMAL_OTHER': 'Animal',
            'GAMING': 'Gaming',
            'NEWS_EVENT': 'News',
            'EMERGING': 'Emerging',
            'CRYPTO': 'Crypto',
            'SOLANA_META': 'SOL',
            'ALPHA_CALL': 'Alpha',
            'FOOD_OBJECT': 'Object',
            'DEFI': 'DeFi'
        };
        return labels[category] || category || 'Trend';
    }

    formatCompactNumber(num) {
        if (!num || num === 0) return null;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
        return `$${num.toFixed(0)}`;
    }

    // ============================================
    // WATCHLIST FUNCTIONALITY
    // ============================================

    loadWatchlist() {
        try {
            const saved = localStorage.getItem('na_watchlist');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    saveWatchlist() {
        localStorage.setItem('na_watchlist', JSON.stringify(this.watchlist));
    }

    addToWatchlist(token) {
        if (!this.isInWatchlist(token.address)) {
            this.watchlist.push({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                addedAt: Date.now()
            });
            this.saveWatchlist();
            this.showNotification(`${token.symbol} added to watchlist`);
        }
    }

    removeFromWatchlist(address) {
        const token = this.watchlist.find(t => t.address === address);
        this.watchlist = this.watchlist.filter(t => t.address !== address);
        this.saveWatchlist();
        if (token) {
            this.showNotification(`${token.symbol} removed from watchlist`);
        }
    }

    isInWatchlist(address) {
        return this.watchlist.some(t => t.address === address);
    }

    setupWatchlistUI() {
        // Watchlist filter is handled in the filter buttons
        // Nothing special needed here for now
    }

    // ============================================
    // SOUND ALERT FUNCTIONALITY
    // ============================================

    initAlertSound() {
        // Create audio context for alert sounds
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio context not available');
        }
    }

    playAlertSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        // Prevent sound spam - minimum 30 seconds between alerts
        const now = Date.now();
        if (now - this.lastAlertTime < 30000) return;
        this.lastAlertTime = now;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 880; // A5 note
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);

            // Second beep
            setTimeout(() => {
                const osc2 = this.audioContext.createOscillator();
                const gain2 = this.audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(this.audioContext.destination);
                osc2.frequency.value = 1100;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                osc2.start(this.audioContext.currentTime);
                osc2.stop(this.audioContext.currentTime + 0.3);
            }, 150);
        } catch (e) {
            console.warn('Could not play alert sound');
        }
    }

    setupSoundAlertUI() {
        const toggleBtn = document.getElementById('soundToggle');
        if (!toggleBtn) return;

        // Set initial state
        this.updateSoundToggleUI();

        toggleBtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            localStorage.setItem('na_sound_enabled', this.soundEnabled.toString());
            this.updateSoundToggleUI();

            // Resume audio context on user interaction (required by browsers)
            if (this.soundEnabled && this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }

            // Play test sound when enabled
            if (this.soundEnabled) {
                this.playAlertSound();
            }
        });
    }

    updateSoundToggleUI() {
        const toggleBtn = document.getElementById('soundToggle');
        if (!toggleBtn) return;

        const soundOn = toggleBtn.querySelector('.sound-on');
        const soundOff = toggleBtn.querySelector('.sound-off');

        if (this.soundEnabled) {
            toggleBtn.classList.add('active');
            toggleBtn.title = 'Sound alerts ON - click to disable';
            soundOn?.classList.remove('hidden');
            soundOff?.classList.add('hidden');
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.title = 'Sound alerts OFF - click to enable';
            soundOn?.classList.add('hidden');
            soundOff?.classList.remove('hidden');
        }
    }

    showNotification(message, type = 'success') {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = `na-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Validate if a token has genuine trading activity (not dead)
    validateTokenActivity(token) {
        const volume1h = token.volume1h || 0;
        const txns1h = token.txns1h || (token.txns24h ? Math.floor(token.txns24h / 24) : 0);
        const buyRatio = token.buyRatio || 0.5;
        const priceChange1h = token.priceChange1h || 0;

        const thresholds = CONFIG?.VALIDATION || {
            DEAD_VOLUME_THRESHOLD: 500,
            DEAD_TXNS_THRESHOLD: 5,
            MIN_VOLUME_1H: 1000,
            MIN_TXNS_1H: 10
        };

        const result = {
            isValid: true,
            isDead: false,
            isLowActivity: false,
            warnings: [],
            adjustedConfidence: token.confidence || 50
        };

        // Check for dead token (price moving but no volume/activity)
        if (volume1h < thresholds.DEAD_VOLUME_THRESHOLD || txns1h < thresholds.DEAD_TXNS_THRESHOLD) {
            result.isDead = true;
            result.isValid = false;
            result.warnings.push('NO_ACTIVITY');
            result.adjustedConfidence = Math.max(10, result.adjustedConfidence - 40);
        }
        // Check for low activity
        else if (volume1h < thresholds.MIN_VOLUME_1H || txns1h < thresholds.MIN_TXNS_1H) {
            result.isLowActivity = true;
            result.warnings.push('LOW_ACTIVITY');
            result.adjustedConfidence = Math.max(20, result.adjustedConfidence - 20);
        }

        // Cross-validate buy ratio with price direction
        if (priceChange1h > 20 && buyRatio < 0.4) {
            result.warnings.push('BUY_PRICE_MISMATCH');
            result.adjustedConfidence = Math.max(15, result.adjustedConfidence - 25);
        }

        if (priceChange1h < -20 && buyRatio > 0.7) {
            result.warnings.push('SELL_PRICE_MISMATCH');
            result.adjustedConfidence = Math.max(15, result.adjustedConfidence - 25);
        }

        return result;
    }

    // Detect potential honeypot/scam tokens
    detectScamIndicators(token) {
        const thresholds = CONFIG?.VALIDATION || {
            MCAP_LIQ_WARNING: 50,
            MCAP_LIQ_CRITICAL: 100,
            HONEYPOT_BUY_RATIO: 0.95,
            SCAM_SCORE_FILTER: 70,
            SCAM_SCORE_HIGH_RISK: 40
        };

        const result = {
            isScam: false,
            isPotentialHoneypot: false,
            isHighRisk: false,
            scamScore: 0,
            warnings: [],
            shouldFilter: false
        };

        const mcap = token.marketCap || 0;
        const liquidity = token.liquidity || 0;
        const volume24h = token.volume24h || 0;
        const volume1h = token.volume1h || 0;
        const buyRatio = token.buyRatio || 0.5;
        const txns24h = token.txns24h || 0;
        const priceChange1h = token.priceChange1h || 0;
        const ageHours = token.ageHours || (token.createdAt ? (Date.now() - token.createdAt) / 3600000 : 999);

        // 1. EXTREME MCAP/LIQUIDITY RATIO (potential rug)
        if (mcap > 0 && liquidity > 0) {
            const mcapLiqRatio = mcap / liquidity;

            if (mcapLiqRatio > thresholds.MCAP_LIQ_CRITICAL) {
                result.warnings.push({
                    type: 'EXTREME_MCAP_LIQ',
                    severity: 'critical',
                    message: `MC/Liq ${mcapLiqRatio.toFixed(0)}x - EXIT IMPOSSIBLE`
                });
                result.scamScore += 40;
                result.isHighRisk = true;
            } else if (mcapLiqRatio > thresholds.MCAP_LIQ_WARNING) {
                result.warnings.push({
                    type: 'HIGH_MCAP_LIQ',
                    severity: 'warning',
                    message: `MC/Liq ${mcapLiqRatio.toFixed(0)}x - thin liquidity`
                });
                result.scamScore += 20;
            }
        }

        // 2. HONEYPOT PATTERN: High buys but no price movement
        if (buyRatio > thresholds.HONEYPOT_BUY_RATIO && Math.abs(priceChange1h) < 2 && txns24h > 100) {
            result.warnings.push({
                type: 'HONEYPOT_PATTERN',
                severity: 'critical',
                message: `${Math.round(buyRatio * 100)}% buys but price flat - HONEYPOT`
            });
            result.scamScore += 50;
            result.isPotentialHoneypot = true;
        }

        // 3. ZERO RECENT TRANSACTIONS
        const txns1h = token.txns1h || Math.floor(txns24h / 24);
        if (txns1h === 0 && volume1h === 0 && mcap > 10000) {
            result.warnings.push({
                type: 'ZERO_ACTIVITY',
                severity: 'warning',
                message: 'No transactions in last hour'
            });
            result.scamScore += 15;
        }

        // 4. EXTREME BUY/SELL IMBALANCE with volume
        if (buyRatio > 0.98 && volume24h > 10000) {
            result.warnings.push({
                type: 'SELL_BLOCKED',
                severity: 'critical',
                message: '99%+ buys - sells blocked'
            });
            result.scamScore += 35;
            result.isPotentialHoneypot = true;
        }

        // 5. MICRO LIQUIDITY with high mcap claims
        if (liquidity < 1000 && mcap > 100000) {
            result.warnings.push({
                type: 'FAKE_MCAP',
                severity: 'critical',
                message: `$${this.formatCompact(mcap)} MC but $${this.formatCompact(liquidity)} liq`
            });
            result.scamScore += 45;
            result.isHighRisk = true;
        }

        // 6. INSTANT PUMP PATTERN (coordinated launch scam)
        if (ageHours < 0.5 && priceChange1h > 500 && buyRatio > 0.9) {
            result.warnings.push({
                type: 'COORDINATED_PUMP',
                severity: 'warning',
                message: 'Coordinated launch pump'
            });
            result.scamScore += 25;
        }

        // 7. SLOW-BLEED HONEYPOT: High buys but consistent price decline
        const priceChange6h = token.priceChange6h || 0;
        const priceChange24h = token.priceChange24h || 0;
        if (buyRatio > 0.55 && priceChange1h < -5 && priceChange6h < -10 && priceChange24h < -15) {
            result.warnings.push({
                type: 'SLOW_BLEED',
                severity: 'critical',
                message: `${Math.round(buyRatio * 100)}% buys but -${Math.abs(priceChange24h).toFixed(0)}% 24h - sell tax likely`
            });
            result.scamScore += 25;
            result.isPotentialHoneypot = true;
        }

        // 8. SELL-TAX INDICATOR: Very high buys with significant price drop
        if (buyRatio > 0.75 && priceChange1h < -10 && txns24h > 50) {
            result.warnings.push({
                type: 'SELL_TAX',
                severity: 'warning',
                message: `${Math.round(buyRatio * 100)}% buys but -${Math.abs(priceChange1h).toFixed(0)}% 1h - potential sell tax`
            });
            result.scamScore += 20;
        }

        // Determine overall status
        if (result.scamScore >= thresholds.SCAM_SCORE_FILTER) {
            result.isScam = true;
            result.shouldFilter = true;
        } else if (result.scamScore >= thresholds.SCAM_SCORE_HIGH_RISK) {
            result.isHighRisk = true;
        }

        return result;
    }

    // Generate specific, actionable signal description based on data patterns
    generateSignalEdge(token) {
        const { priceChange5m, priceChange1h, priceChange24h, volume24h, volume1h, liquidity, buyRatio, txns24h, marketCap } = token;

        const ageHours = token.createdAt ? (Date.now() - token.createdAt) / (1000 * 60 * 60) : 999;
        const volumeVelocity = liquidity > 0 ? volume24h / liquidity : 0;
        const avgTxSize = txns24h > 0 ? volume24h / txns24h : 0;
        const txns1h = token.txns1h || Math.floor(txns24h / 24);

        // Validate token activity first
        const validation = this.validateTokenActivity(token);

        // DEAD TOKEN CHECK - Override any positive signal
        if (validation.isDead) {
            if (Math.abs(priceChange1h) > 10) {
                return {
                    edge: `${priceChange1h > 0 ? '+' : ''}${priceChange1h.toFixed(0)}% but no volume ($${this.formatCompact(volume1h || 0)} 1h) - suspicious`,
                    tag: 'DEAD',
                    confidence: validation.adjustedConfidence
                };
            }
            return {
                edge: `Dead: $${this.formatCompact(volume1h || 0)} vol, ${txns1h} txns - no activity`,
                tag: 'DEAD',
                confidence: validation.adjustedConfidence
            };
        }

        // LOW ACTIVITY CHECK
        if (validation.isLowActivity && Math.abs(priceChange1h) < 20) {
            return {
                edge: `Low activity: $${this.formatCompact(volume1h || 0)} vol, ${txns1h} txns/h - illiquid`,
                tag: 'LOW ACTIVITY',
                confidence: validation.adjustedConfidence
            };
        }

        // Priority-ordered pattern detection

        // LAUNCH SIGNALS
        if (ageHours < 1) {
            if (priceChange5m > 20 && (volume1h || 0) > 1000) return { edge: `Just launched +${priceChange5m.toFixed(0)}% in 5m`, tag: 'NEW LAUNCH' };
            if (liquidity > 50000) return { edge: `Fresh launch, $${this.formatCompact(liquidity)} liquidity`, tag: 'NEW LAUNCH' };
            return { edge: `${Math.round(ageHours * 60)}m old - early entry`, tag: 'NEW LAUNCH' };
        }

        if (ageHours < 6 && priceChange1h > 30) {
            return { edge: `Young token +${priceChange1h.toFixed(0)}% 1h - still early`, tag: 'EARLY MOVER' };
        }

        // MOMENTUM SIGNALS - validate with volume
        if (priceChange5m > 15 && priceChange1h > 20) {
            // Validate with volume before PUMPING tag
            if ((volume1h || 0) > 5000 && txns1h > 20 && buyRatio > 0.45) {
                return { edge: `Accelerating +${priceChange5m.toFixed(0)}% 5m, +${priceChange1h.toFixed(0)}% 1h | $${this.formatCompact(volume1h || 0)} vol`, tag: 'PUMPING' };
            } else {
                // Price spiking without volume
                return { edge: `+${priceChange1h.toFixed(0)}% but weak vol ($${this.formatCompact(volume1h || 0)}) - verify`, tag: 'VERIFY' };
            }
        }

        if (priceChange1h > 50) {
            // Validate mooning with volume
            if ((volume1h || 0) > 10000 && txns1h > 30) {
                return { edge: `Parabolic +${priceChange1h.toFixed(0)}% 1h | $${this.formatCompact(volume1h || 0)} vol`, tag: 'MOONING' };
            } else {
                return { edge: `+${priceChange1h.toFixed(0)}% spike, low vol ($${this.formatCompact(volume1h || 0)}) - verify`, tag: 'VERIFY' };
            }
        }

        if (priceChange24h > 100 && priceChange1h > 5) {
            return { edge: `Runner +${priceChange24h.toFixed(0)}% day, +${priceChange1h.toFixed(0)}% 1h`, tag: 'RUNNER' };
        }

        // REVERSAL SIGNALS
        if (priceChange24h < -25 && priceChange1h > 10 && buyRatio > 0.55) {
            return { edge: `Bouncing +${priceChange1h.toFixed(0)}% off ${priceChange24h.toFixed(0)}% drop`, tag: 'REVERSAL' };
        }

        if (priceChange24h < -20 && priceChange5m > 5 && buyRatio > 0.6) {
            return { edge: `Dip buying: ${Math.round(buyRatio*100)}% buys after ${priceChange24h.toFixed(0)}% drop`, tag: 'DIP BUY' };
        }

        // ACCUMULATION SIGNALS
        if (buyRatio > 0.65 && priceChange1h < 5 && priceChange1h > -5) {
            return { edge: `${Math.round(buyRatio*100)}% buys, price flat - accumulation`, tag: 'ACCUMULATING' };
        }

        if (volumeVelocity > 5 && priceChange1h < 10 && priceChange1h > -10) {
            return { edge: `High rotation ${volumeVelocity.toFixed(1)}x vol/liq - consolidating`, tag: 'COILING' };
        }

        // VOLUME SIGNALS
        if (volume1h > 100000 && priceChange1h > 10) {
            return { edge: `Volume spike $${this.formatCompact(volume1h)} 1h, +${priceChange1h.toFixed(0)}%`, tag: 'VOL SURGE' };
        }

        if (avgTxSize > 5000 && priceChange1h > 5) {
            return { edge: `Large buys: $${this.formatCompact(avgTxSize)} avg tx, +${priceChange1h.toFixed(0)}%`, tag: 'WHALES' };
        }

        // WARNING SIGNALS
        if (priceChange24h > 50 && priceChange1h < -10) {
            return { edge: `Profit taking: -${Math.abs(priceChange1h).toFixed(0)}% 1h after +${priceChange24h.toFixed(0)}% run`, tag: 'DISTRIBUTION' };
        }

        if (buyRatio < 0.35 && priceChange1h < -5) {
            return { edge: `Sell pressure: ${Math.round(buyRatio*100)}% buys, down ${Math.abs(priceChange1h).toFixed(0)}%`, tag: 'SELLING' };
        }

        if (priceChange1h < -15) {
            return { edge: `Dumping ${priceChange1h.toFixed(0)}% 1h`, tag: 'DUMPING' };
        }

        // STABLE/HOLDING SIGNALS
        if (priceChange24h > 30 && Math.abs(priceChange1h) < 5) {
            return { edge: `Holding gains: +${priceChange24h.toFixed(0)}% 24h, consolidating`, tag: 'HOLDING' };
        }

        // DEFAULT
        if (priceChange1h > 0) {
            return { edge: `+${priceChange1h.toFixed(0)}% 1h | ${Math.round(buyRatio*100)}% buys | $${this.formatCompact(volume24h)} vol`, tag: 'ACTIVE' };
        } else {
            return { edge: `${priceChange1h.toFixed(0)}% 1h | ${Math.round(buyRatio*100)}% buys | $${this.formatCompact(volume24h)} vol`, tag: 'WATCHING' };
        }
    }

    createSignalCard(token) {
        const priceChange24hClass = token.priceChange24h >= 0 ? 'positive' : 'negative';
        const priceChange24hSign = token.priceChange24h >= 0 ? '+' : '';
        const priceChange1hClass = token.priceChange1h >= 0 ? 'positive' : 'negative';
        const priceChange1hSign = token.priceChange1h >= 0 ? '+' : '';
        const urgentClass = token.isUrgent ? 'urgent' : '';

        const timeAgo = token.createdAt ? this.getTimeAgo(token.createdAt) : 'Active';
        const isPumpFun = token.isPumpFunStyle || (token.dexId || '').toLowerCase() === 'pumpfun';
        const source = isPumpFun ? 'PumpFun' :
                       token.dexId === 'raydium' ? 'Raydium' :
                       token.dexId === 'orca' ? 'Orca' :
                       token.dexId === 'meteora' ? 'Meteora' : 'DEX';
        const sourceSlug = isPumpFun ? 'pumpfun' : 'dex';

        // Generate the specific edge/signal description
        let { edge, tag } = this.generateSignalEdge(token);

        // Override edge for PumpFun-style tokens (new, low-cap memecoins)
        if (isPumpFun) {
            const ageHours = token.ageHours || (token.createdAt ? (Date.now() - token.createdAt) / (1000 * 60 * 60) : 999);
            const ageDisplay = ageHours < 1 ? `${Math.floor(ageHours * 60)}m` : ageHours < 24 ? `${Math.floor(ageHours)}h` : `${Math.floor(ageHours / 24)}d`;

            if (ageHours < 1 && token.priceChange1h > 20) {
                edge = `Fresh launch pumping! +${token.priceChange1h.toFixed(0)}% | MC: $${this.formatCompact(token.marketCap)}`;
                tag = 'NEW PUMP';
            } else if (ageHours < 6) {
                edge = `${ageDisplay} old | +${token.priceChange1h.toFixed(0)}% 1h | MC: $${this.formatCompact(token.marketCap)} | ${token.txns24h} txns`;
                tag = 'FRESH';
            } else if (ageHours < 24 && token.priceChange1h > 10) {
                edge = `Day-1 runner: +${token.priceChange1h.toFixed(0)}% 1h | Vol: $${this.formatCompact(token.volume24h)}`;
                tag = 'NEW MOVER';
            } else if (token.priceChange1h > 30) {
                edge = `Pumping +${token.priceChange1h.toFixed(0)}% 1h | MC: $${this.formatCompact(token.marketCap)}`;
                tag = 'PUMPING';
            } else if (token.priceChange1h < -20) {
                edge = `Dumping ${token.priceChange1h.toFixed(0)}% 1h | MC: $${this.formatCompact(token.marketCap)} - dip or dead?`;
                tag = 'DUMPING';
            } else {
                edge = `MC: $${this.formatCompact(token.marketCap)} | Vol: $${this.formatCompact(token.volume24h)} | ${token.txns24h} txns`;
                tag = 'MEMECOIN';
            }
        }

        // Run scam detection if not already done
        const scamCheck = token.scamCheck || this.detectScamIndicators(token);
        const validation = this.validateTokenActivity(token);

        // Override positive tags when high-risk indicators detected
        const positiveSignals = ['PUMPING', 'MOONING', 'RUNNER', 'REVERSAL', 'DIP BUY', 'ACCUMULATING', 'VOL SURGE', 'WHALES', 'NEW LAUNCH', 'EARLY MOVER', 'NEW PUMP', 'FRESH', 'NEW MOVER'];
        if (scamCheck.isPotentialHoneypot && positiveSignals.includes(tag)) {
            const scamWarning = scamCheck.warnings[0]?.message || 'Honeypot pattern detected';
            edge = `${scamWarning} | ${edge}`;
            tag = 'VERIFY';
        } else if (scamCheck.isHighRisk && positiveSignals.includes(tag)) {
            const scamWarning = scamCheck.warnings[0]?.message || 'High risk indicators';
            edge = `${scamWarning} | ${edge}`;
            tag = 'VERIFY';
        }

        // Determine tag color based on signal type and validation
        let tagClass = '';
        if (tag === 'DEAD' || tag === 'LOW ACTIVITY') {
            tagClass = 'dead';
        } else if (tag === 'VERIFY') {
            tagClass = 'verify';
        } else if (['PUMPING', 'MOONING', 'RUNNER', 'REVERSAL', 'DIP BUY', 'ACCUMULATING', 'VOL SURGE', 'WHALES', 'NEW LAUNCH', 'EARLY MOVER', 'NEW PUMP', 'FRESH', 'NEW MOVER'].includes(tag)) {
            tagClass = 'positive';
        } else if (['DISTRIBUTION', 'SELLING', 'DUMPING'].includes(tag)) {
            tagClass = 'negative';
        }

        // Build warning badges HTML
        let warningBadges = '';
        if (scamCheck.isPotentialHoneypot) {
            warningBadges += '<span class="scam-badge honeypot" title="Potential honeypot - sells may be blocked">HONEYPOT?</span>';
        } else if (scamCheck.isHighRisk) {
            warningBadges += '<span class="scam-badge high-risk" title="High risk indicators detected">HIGH RISK</span>';
        }
        if (validation.isDead) {
            warningBadges += '<span class="scam-badge dead-badge" title="No trading activity">DEAD</span>';
        }

        // Stats layout - same for all tokens now (showing useful trading data)
        const statsHtml = isPumpFun ? `
                <div class="signal-stats">
                    <div class="signal-stat">
                        <span class="signal-stat-value ${priceChange1hClass}">${priceChange1hSign}${token.priceChange1h.toFixed(1)}%</span>
                        <span class="signal-stat-label">1h</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value ${priceChange24hClass}">${priceChange24hSign}${token.priceChange24h.toFixed(1)}%</span>
                        <span class="signal-stat-label">24h</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatCompact(token.marketCap)}</span>
                        <span class="signal-stat-label">MCap</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatCompact(token.volume24h)}</span>
                        <span class="signal-stat-label">Vol</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatCompact(token.liquidity)}</span>
                        <span class="signal-stat-label">Liq</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">${token.txns24h}</span>
                        <span class="signal-stat-label">Txns</span>
                    </div>
                </div>
        ` : `
                <div class="signal-stats">
                    <div class="signal-stat">
                        <span class="signal-stat-value ${priceChange1hClass}">${priceChange1hSign}${token.priceChange1h.toFixed(1)}%</span>
                        <span class="signal-stat-label">1h</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value ${priceChange24hClass}">${priceChange24hSign}${token.priceChange24h.toFixed(1)}%</span>
                        <span class="signal-stat-label">24h</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatCompact(token.volume24h)}</span>
                        <span class="signal-stat-label">Vol</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatCompact(token.liquidity)}</span>
                        <span class="signal-stat-label">Liq</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">${Math.round(token.buyRatio * 100)}%</span>
                        <span class="signal-stat-label">Buys</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">${token.velocity}x</span>
                        <span class="signal-stat-label">Vel</span>
                    </div>
                </div>
        `;

        // Calculate age in hours for filtering
        const ageHours = token.createdAt ? (Date.now() - token.createdAt) / (1000 * 60 * 60) : 999;

        // Determine card classes based on risk
        const riskClass = scamCheck.isPotentialHoneypot ? 'honeypot-warning' : scamCheck.isHighRisk ? 'high-risk' : '';
        const deadClass = validation.isDead ? 'dead-token' : '';

        // Escape user-controllable data to prevent XSS
        const safeSymbol = escapeHtml(token.symbol);
        const safeAddress = isValidSolanaAddress(token.address) ? token.address : '';
        const safeEdge = escapeHtml(edge);
        const safeTag = escapeHtml(tag);

        // Check if token is in watchlist
        const isWatchlisted = this.isInWatchlist(safeAddress);
        const watchlistClass = isWatchlisted ? 'active' : '';

        return `
            <div class="signal-card ${urgentClass} ${riskClass} ${deadClass}" data-type="${escapeHtml(token.signalType)}" data-address="${safeAddress}" data-source="${sourceSlug}" data-tag="${safeTag}" data-age="${ageHours.toFixed(1)}" data-volume="${token.volume24h || 0}" data-scam-score="${scamCheck.scamScore}">
                <div class="signal-header">
                    <span class="signal-tag ${tagClass}">${safeTag}</span>
                    ${warningBadges}
                    <span class="signal-source ${sourceSlug}">${source}</span>
                    <span class="signal-time">${timeAgo}</span>
                    <button class="watchlist-btn ${watchlistClass}" data-address="${safeAddress}" data-symbol="${safeSymbol}" data-name="${escapeHtml(token.name || token.symbol)}" title="${isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}">
                        <svg viewBox="0 0 24 24" fill="${isWatchlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </button>
                </div>
                <div class="signal-token">
                    <strong>$${safeSymbol}</strong>
                    <span class="token-price">$${this.formatNumber(token.price)}</span>
                </div>
                <div class="signal-edge">${safeEdge}</div>
                ${statsHtml}
            </div>
        `;
    }

    renderTrendingTokens(tokens) {
        if (!this.elements.trendingTokensList) return;

        const html = tokens.map(token => {
            const changeClass = token.priceChange24h >= 0 ? 'positive' : 'negative';
            const changeSign = token.priceChange24h >= 0 ? '+' : '';
            const safeAddress = isValidSolanaAddress(token.address) ? token.address : '';
            return `
                <span class="quick-token" data-address="${safeAddress}">
                    $${escapeHtml(token.symbol)}
                    <span class="token-change ${changeClass}">${changeSign}${token.priceChange24h.toFixed(0)}%</span>
                </span>
            `;
        }).join('');

        this.elements.trendingTokensList.innerHTML = html;

        // Add click handlers
        this.elements.trendingTokensList.querySelectorAll('.quick-token').forEach(token => {
            token.addEventListener('click', () => {
                const address = token.dataset.address;
                if (address) {
                    this.loadTokenDetails(address);
                }
            });
        });
    }

    renderFallbackSignals() {
        // Show error state when API fails - no fake data
        if (this.elements.signalsFeed) {
            this.elements.signalsFeed.innerHTML = `
                <div class="signals-error">
                    <div class="error-icon">⚠</div>
                    <div class="error-title">Unable to fetch live data</div>
                    <div class="error-message">DEX Screener API may be rate limited or unavailable. Data will auto-refresh in 30 seconds.</div>
                    <button class="retry-btn" onclick="window.liveDataService?.fetchTrendingTokens()">Retry Now</button>
                </div>
            `;
        }
    }

    async searchToken() {
        const query = this.elements.tokenSearchInput?.value.trim();
        if (!query) return;

        // Check if it's a Solana address (base58, 32-44 chars)
        const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);

        if (isSolanaAddress) {
            await this.loadTokenDetails(query);
        } else {
            // Search by name/symbol
            await this.searchTokenByName(query);
        }
    }

    async searchTokenByName(query) {
        try {
            // Use correct search endpoint per docs
            const response = await fetch(`${this.dexScreenerBaseUrl}/latest/dex/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            const solanaPairs = (data.pairs || []).filter(p => p.chainId === 'solana');

            if (solanaPairs.length > 0) {
                // Load the first result
                await this.loadTokenDetails(solanaPairs[0].baseToken.address);
            } else {
                alert('No Solana tokens found for that search. Try a contract address.');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Search failed. Please try again.');
        }
    }

    async loadTokenDetails(address) {
        this.currentTokenAddress = address;

        try {
            // Fetch token data from DEX Screener using correct endpoint per docs
            // /tokens/v1/{chainId}/{tokenAddresses} - supports up to 30 addresses
            const response = await fetch(`${this.dexScreenerBaseUrl}/tokens/v1/solana/${address}`);
            if (!response.ok) throw new Error('Token not found');

            const data = await response.json();
            // Response is an array of pairs for this token
            const pairs = Array.isArray(data) ? data : (data.pairs || []);

            if (pairs.length === 0) {
                throw new Error('No trading pairs found for this token');
            }

            // Use the most liquid pair
            const primaryPair = pairs.sort((a, b) =>
                (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];

            // Check if token is boosted/paid on DEX Screener
            const boostInfo = await this.checkTokenBoost(address);

            this.updateTokenDisplay(primaryPair, pairs, boostInfo);
            this.updateChartEmbed(address, primaryPair.pairAddress);
            this.updateExternalLinks(address, primaryPair);

            // Update search input
            if (this.elements.tokenSearchInput) {
                this.elements.tokenSearchInput.value = address;
            }

            // Fetch AI narrative analysis (async - doesn't block UI)
            this.fetchNarrativeIntel(primaryPair, address, boostInfo);

        } catch (error) {
            console.error('Error loading token:', error);
            alert(`Could not load token: ${error.message}`);
        }
    }

    // Check if token is boosted/paid on DEX Screener
    async checkTokenBoost(address) {
        try {
            // Check orders endpoint for paid promotions
            const response = await fetch(`${this.dexScreenerBaseUrl}/orders/v1/solana/${address}`);
            if (!response.ok) return null;

            const orders = await response.json();

            if (orders && orders.length > 0) {
                // Token has active paid orders
                const activeOrders = orders.filter(o => o.status === 'active' || o.status === 'processing');
                const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

                return {
                    isPaid: true,
                    activeOrders: activeOrders.length,
                    totalOrders: orders.length,
                    totalSpent: totalAmount,
                    type: orders[0]?.type || 'boost' // tokenProfile, communityTakeover, or boost
                };
            }
            return { isPaid: false };
        } catch (error) {
            console.warn('Boost check failed:', error.message);
            return null;
        }
    }

    // Fetch AI-powered narrative intelligence
    async fetchNarrativeIntel(pair, address, boostInfo) {
        const reasonsEl = document.getElementById('trendingReasons');
        if (!reasonsEl) return;

        // Show loading state
        reasonsEl.innerHTML = `
            <div class="narrative-loading">
                <div class="loading-spinner small"></div>
                <span>Analyzing narrative context...</span>
            </div>
        `;

        try {
            // Also try to get PumpFun data for more context
            let pumpFunData = null;
            const cachedPumpFun = this.cachedPumpFunTokens.find(t => t.address === address);
            if (cachedPumpFun) {
                pumpFunData = cachedPumpFun;
            }

            const tokenData = {
                symbol: pair.baseToken?.symbol || 'UNKNOWN',
                name: pair.baseToken?.name || 'Unknown Token',
                address: address,
                price: pair.priceUsd || 0,
                marketCap: pair.fdv || pair.marketCap || 0,
                volume24h: pair.volume?.h24 || 0,
                liquidity: pair.liquidity?.usd || 0,
                priceChange24h: pair.priceChange?.h24 || 0,
                priceChange1h: pair.priceChange?.h1 || 0,
                dexId: pair.dexId,
                ageHours: pair.pairCreatedAt ? Math.floor((Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60)) : null,
                description: pumpFunData?.description || pair.info?.description || '',
                socials: pumpFunData?.socials || pair.info?.socials || [],
                websites: pair.info?.websites || [],
                replyCount: pumpFunData?.replyCount || null,
                boostInfo: boostInfo || null
            };

            const response = await fetch('/.netlify/functions/token-intel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tokenData)
            });

            if (!response.ok) {
                throw new Error('Failed to fetch narrative intel');
            }

            const intel = await response.json();
            this.displayNarrativeIntel(intel);

        } catch (error) {
            console.error('Narrative intel error:', error);
            // Fall back to basic analysis
            this.updateTrendingReasons(pair);
        }
    }

    // Display AI-generated narrative intelligence
    displayNarrativeIntel(intel) {
        const reasonsEl = document.getElementById('trendingReasons');
        if (!reasonsEl) return;

        const timingClass = intel.timing_read === 'EARLY' ? 'positive' :
                           intel.timing_read === 'LATE' ? 'negative' : '';

        reasonsEl.innerHTML = `
            <div class="narrative-intel">
                <div class="intel-hook">
                    <span class="intel-label">THE HOOK</span>
                    <p>${intel.narrative_hook || 'No clear narrative detected'}</p>
                </div>

                <div class="intel-row">
                    <div class="intel-item">
                        <span class="intel-label">ORIGIN</span>
                        <p>${intel.likely_origin || 'Unknown'}</p>
                    </div>
                    <div class="intel-item">
                        <span class="intel-label">NARRATIVE</span>
                        <p>${intel.narrative_fit || 'Uncategorized'}</p>
                    </div>
                    <div class="intel-item">
                        <span class="intel-label">TIMING</span>
                        <p class="${timingClass}">${intel.timing_read || 'UNKNOWN'}</p>
                    </div>
                </div>

                ${intel.social_signals?.length > 0 ? `
                <div class="intel-section">
                    <span class="intel-label">SOCIAL SIGNALS</span>
                    <ul>${intel.social_signals.map(s => `<li>${s}</li>`).join('')}</ul>
                </div>
                ` : ''}

                <div class="intel-section">
                    <span class="intel-label">THE PLAY</span>
                    <p class="the-play">${intel.the_play || 'No clear trade thesis'}</p>
                </div>

                ${intel.red_flags?.length > 0 ? `
                <div class="intel-section red-flags">
                    <span class="intel-label">RED FLAGS</span>
                    <ul>${intel.red_flags.map(r => `<li>${r}</li>`).join('')}</ul>
                </div>
                ` : ''}

                ${intel.similar_plays?.length > 0 ? `
                <div class="intel-section">
                    <span class="intel-label">SIMILAR PLAYS</span>
                    <ul>${intel.similar_plays.map(s => `<li>${s}</li>`).join('')}</ul>
                </div>
                ` : ''}

                <div class="intel-section alpha-take">
                    <span class="intel-label">ALPHA TAKE</span>
                    <p>${intel.alpha_take || 'Insufficient data for assessment'}</p>
                </div>
            </div>
        `;
    }

    updateTokenDisplay(pair, allPairs, boostInfo) {
        // Token identity
        const logoEl = document.getElementById('tokenLogo');
        const nameEl = document.getElementById('tokenName');
        const symbolEl = document.getElementById('tokenSymbol');
        const boostBadgeEl = document.getElementById('tokenBoostBadge');

        if (logoEl) {
            logoEl.src = pair.info?.imageUrl || '';
            logoEl.style.display = pair.info?.imageUrl ? 'block' : 'none';
        }
        if (nameEl) nameEl.textContent = pair.baseToken?.name || 'Unknown Token';
        if (symbolEl) symbolEl.textContent = `$${pair.baseToken?.symbol || '???'}`;

        // Show/hide DEX paid badge
        if (boostBadgeEl) {
            if (boostInfo?.isPaid) {
                boostBadgeEl.classList.remove('hidden');
                const boostType = boostInfo.type === 'tokenProfile' ? 'PROMOTED' :
                                  boostInfo.type === 'communityTakeover' ? 'CTO' : 'DEX PAID';
                boostBadgeEl.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/></svg>
                    ${boostType}
                `;
                boostBadgeEl.title = `This token has ${boostInfo.totalOrders} paid order(s) on DEX Screener`;
            } else {
                boostBadgeEl.classList.add('hidden');
            }
        }

        // Price with multi-timeframe changes
        const priceEl = document.getElementById('tokenPrice');
        const priceChangeEl = document.getElementById('tokenPriceChange');
        const price = parseFloat(pair.priceUsd || 0);
        const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
        const priceChange1h = parseFloat(pair.priceChange?.h1 || 0);
        const priceChange5m = parseFloat(pair.priceChange?.m5 || 0);

        if (priceEl) priceEl.textContent = `$${this.formatNumber(price)}`;
        if (priceChangeEl) {
            const sign24h = priceChange24h >= 0 ? '+' : '';
            const sign1h = priceChange1h >= 0 ? '+' : '';
            const sign5m = priceChange5m >= 0 ? '+' : '';
            priceChangeEl.innerHTML = `
                <span class="${priceChange5m >= 0 ? 'positive' : 'negative'}">${sign5m}${priceChange5m.toFixed(1)}% 5m</span>
                <span class="${priceChange1h >= 0 ? 'positive' : 'negative'}">${sign1h}${priceChange1h.toFixed(1)}% 1h</span>
                <span class="${priceChange24h >= 0 ? 'positive' : 'negative'}">${sign24h}${priceChange24h.toFixed(1)}% 24h</span>
            `;
        }

        // Metrics
        const mcap = parseFloat(pair.fdv || pair.marketCap || 0);
        const volume24h = parseFloat(pair.volume?.h24 || 0);
        const volume1h = parseFloat(pair.volume?.h1 || 0);
        const liquidity = parseFloat(pair.liquidity?.usd || 0);
        const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
        const buys24h = pair.txns?.h24?.buys || 0;
        const sells24h = pair.txns?.h24?.sells || 0;
        const buyRatio = txns24h > 0 ? Math.round((buys24h / txns24h) * 100) : 50;

        document.getElementById('tokenMcap').textContent = `$${this.formatCompact(mcap)}`;
        document.getElementById('tokenVolume').textContent = `$${this.formatCompact(volume24h)}`;
        document.getElementById('tokenLiquidity').textContent = `$${this.formatCompact(liquidity)}`;

        // Buy/Sell ratio and transaction count
        const holdersEl = document.getElementById('tokenHolders');
        const topHoldersEl = document.getElementById('tokenTopHolders');

        if (holdersEl) {
            holdersEl.innerHTML = `<span class="${buyRatio > 55 ? 'positive' : buyRatio < 45 ? 'negative' : ''}">${buyRatio}% buys</span>`;
        }
        if (topHoldersEl) {
            topHoldersEl.textContent = `${this.formatCompact(txns24h)} txns`;
        }

        // Created date / pair age
        const createdEl = document.getElementById('tokenCreated');
        if (pair.pairCreatedAt) {
            const ageMs = Date.now() - pair.pairCreatedAt;
            const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
            const ageDays = Math.floor(ageHours / 24);

            if (ageDays > 0) {
                createdEl.textContent = `${ageDays}d ${ageHours % 24}h old`;
            } else {
                createdEl.textContent = `${ageHours}h old`;
            }
        } else {
            createdEl.textContent = 'Unknown';
        }

        // Why trending analysis
        this.updateTrendingReasons(pair);

        // Contract address
        const addressEl = document.querySelector('.address-text');
        if (addressEl) addressEl.textContent = pair.baseToken?.address || '---';

        // Social links
        this.updateSocialLinks(pair.info);
    }

    updateTrendingReasons(pair) {
        const reasonsEl = document.getElementById('trendingReasons');
        if (!reasonsEl) return;

        const insights = [];

        // Extract all data points
        const price = parseFloat(pair.priceUsd || 0);
        const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
        const priceChange6h = parseFloat(pair.priceChange?.h6 || 0);
        const priceChange1h = parseFloat(pair.priceChange?.h1 || 0);
        const priceChange5m = parseFloat(pair.priceChange?.m5 || 0);
        const volume24h = parseFloat(pair.volume?.h24 || 0);
        const volume6h = parseFloat(pair.volume?.h6 || 0);
        const volume1h = parseFloat(pair.volume?.h1 || 0);
        const liquidity = parseFloat(pair.liquidity?.usd || 0);
        const mcap = parseFloat(pair.fdv || pair.marketCap || 0);

        const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
        const txns1h = (pair.txns?.h1?.buys || 0) + (pair.txns?.h1?.sells || 0);
        const buys24h = pair.txns?.h24?.buys || 0;
        const sells24h = pair.txns?.h24?.sells || 0;
        const buys1h = pair.txns?.h1?.buys || 0;
        const sells1h = pair.txns?.h1?.sells || 0;

        const buyRatio24h = txns24h > 0 ? buys24h / txns24h : 0.5;
        const buyRatio1h = txns1h > 0 ? buys1h / txns1h : 0.5;

        // Derived metrics for edge
        const avgTxSize = txns24h > 0 ? volume24h / txns24h : 0;
        const volumeAccel = volume6h > 0 ? (volume1h * 6) / volume6h : 1; // Volume acceleration
        const priceVolDivergence = priceChange1h !== 0 ? (volume1h / (volume24h / 24)) / Math.abs(priceChange1h) : 0;
        const momentumShift = priceChange1h - (priceChange24h / 24); // Is recent momentum stronger?
        const ageHours = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60) : 999;

        // === ACTIONABLE TRADING SIGNALS ===

        // 1. MOMENTUM STRUCTURE - Is the move accelerating or exhausting?
        if (priceChange5m > 5 && priceChange1h > 15 && priceChange1h > priceChange24h * 0.5) {
            insights.push(`<span class="positive">ACCELERATION:</span> Move is gaining speed - 1h outpacing 24h trend. Momentum chasers entering.`);
        } else if (priceChange24h > 30 && priceChange1h < 2 && priceChange5m < 1) {
            insights.push(`<span class="negative">STALLING:</span> Big 24h move but momentum dying. Late entries getting trapped - watch for reversal.`);
        } else if (priceChange24h > 50 && priceChange1h < -5) {
            insights.push(`<span class="negative">DISTRIBUTION:</span> Dumping after pump. Early buyers taking profit - don't catch the knife.`);
        }

        // 2. VOLUME TELLS - What is volume saying about conviction?
        if (volumeAccel > 2.5) {
            insights.push(`<span class="positive">VOLUME SURGE:</span> Last hour ${volumeAccel.toFixed(1)}x normal rate. Fresh capital entering - potential breakout.`);
        } else if (volumeAccel < 0.3 && priceChange1h > 10) {
            insights.push(`<span class="negative">WEAK HANDS:</span> Price up but volume dying. Likely a fake pump - exit liquidity incoming.`);
        }

        if (avgTxSize > 5000) {
            insights.push(`Whale activity: Avg transaction $${this.formatCompact(avgTxSize)}. Following smart money or exit liquidity?`);
        } else if (avgTxSize < 100 && txns24h > 1000) {
            insights.push(`Retail frenzy: Small avg tx ($${avgTxSize.toFixed(0)}) but high count. Viral spread - can moon or rug fast.`);
        }

        // 3. BUY PRESSURE SHIFT - Are buyers gaining or losing control?
        if (buyRatio1h > 0.65 && buyRatio24h < 0.55) {
            insights.push(`<span class="positive">BUYERS RETURNING:</span> 1h buy ratio (${Math.round(buyRatio1h*100)}%) beating 24h (${Math.round(buyRatio24h*100)}%). Sentiment shifting bullish.`);
        } else if (buyRatio1h < 0.4 && buyRatio24h > 0.5) {
            insights.push(`<span class="negative">SELLERS TAKING OVER:</span> Buy ratio dropped from ${Math.round(buyRatio24h*100)}% to ${Math.round(buyRatio1h*100)}%. Distribution phase starting.`);
        } else if (buyRatio1h > 0.7 && priceChange1h < 0) {
            insights.push(`<span class="positive">ABSORPTION:</span> Heavy buying (${Math.round(buyRatio1h*100)}%) but price flat/down. Big seller being absorbed - breakout setup.`);
        }

        // 4. ENTRY TIMING SIGNALS
        if (priceChange24h < -30 && priceChange1h > 5 && buyRatio1h > 0.55) {
            insights.push(`<span class="positive">REVERSAL SETUP:</span> Bouncing off dump with buy pressure returning. Risk entry for bounce play.`);
        } else if (priceChange24h > 0 && priceChange24h < 15 && priceChange1h < 3 && volumeAccel > 1.5) {
            insights.push(`<span class="positive">COILING:</span> Tight price action with volume building. Breakout imminent - set alerts.`);
        } else if (ageHours < 2 && priceChange1h > 50) {
            insights.push(`<span class="negative">LAUNCH PUMP:</span> Fresh token spiking. High risk of dump - if playing, size small and take profits fast.`);
        }

        // 5. RISK SIGNALS - Things that should make you cautious
        if (txns1h < 20 && volume1h > 50000) {
            insights.push(`<span class="negative">WHALE GAME:</span> Few txns but big volume. Single actors moving price - you're not the smart money here.`);
        }

        if (mcap > 0 && liquidity > 0) {
            const mcapLiqRatio = mcap / liquidity;
            if (mcapLiqRatio > 50) {
                insights.push(`<span class="negative">THIN EXIT:</span> MC/Liq ratio ${mcapLiqRatio.toFixed(0)}x. If this dumps, exits will be brutal.`);
            }
        }

        if (priceChange24h > 200 && ageHours < 24) {
            insights.push(`<span class="negative">EXTENDED:</span> +${priceChange24h.toFixed(0)}% day-1. Most gains happen early - risk/reward skewed against latecomers.`);
        }

        // 6. OPPORTUNITY SIGNALS
        if (ageHours < 1 && liquidity > 30000 && buyRatio1h > 0.6) {
            insights.push(`<span class="positive">FRESH + LIQUID:</span> New launch with real liquidity and buy pressure. Early window if narrative hits.`);
        }

        if (priceChange24h > 100 && priceChange1h > 0 && priceChange1h < 10 && buyRatio1h > 0.5) {
            insights.push(`Consolidating gains: Big move holding with continued interest. Looking for higher low for continuation.`);
        }

        // 7. CONTEXT
        if (volume24h > 0 && mcap > 0) {
            const volMcapRatio = (volume24h / mcap) * 100;
            if (volMcapRatio > 100) {
                insights.push(`High turnover: ${volMcapRatio.toFixed(0)}% of MC traded in 24h. Active speculation - moves both ways will be violent.`);
            }
        }

        if (insights.length === 0) {
            insights.push('No clear edge signals. Choppy action - wait for setup or find better opportunity.');
        }

        reasonsEl.innerHTML = '<ul>' + insights.map(i => `<li>${i}</li>`).join('') + '</ul>';
    }

    updateChartEmbed(tokenAddress, pairAddress) {
        if (!this.elements.chartEmbed) return;

        // Validate addresses before embedding to prevent injection
        const validPairAddress = pairAddress && isValidSolanaAddress(pairAddress) ? pairAddress : null;
        const validTokenAddress = tokenAddress && isValidSolanaAddress(tokenAddress) ? tokenAddress : null;

        if (!validPairAddress && !validTokenAddress) {
            this.elements.chartEmbed.innerHTML = '<div class="chart-error">Invalid token address</div>';
            return;
        }

        // Use DEX Screener embed with validated address
        const embedUrl = validPairAddress
            ? `https://dexscreener.com/solana/${validPairAddress}?embed=1&theme=dark&trades=0&info=0`
            : `https://dexscreener.com/solana/${validTokenAddress}?embed=1&theme=dark&trades=0&info=0`;

        this.elements.chartEmbed.innerHTML = `
            <iframe
                src="${embedUrl}"
                title="DEX Screener Chart"
                loading="lazy"
            ></iframe>
        `;
    }

    updateExternalLinks(address, pair) {
        // Validate addresses before building URLs
        const validAddress = isValidSolanaAddress(address) ? address : '';
        const validPairAddress = pair?.pairAddress && isValidSolanaAddress(pair.pairAddress)
            ? pair.pairAddress
            : validAddress;

        const dexLink = document.getElementById('linkDexScreener');
        const birdeyeLink = document.getElementById('linkBirdeye');
        const solscanLink = document.getElementById('linkSolscan');
        const pumpfunLink = document.getElementById('linkPumpFun');

        if (dexLink) dexLink.href = validPairAddress ? `https://dexscreener.com/solana/${validPairAddress}` : '#';
        if (birdeyeLink) birdeyeLink.href = validAddress ? `https://birdeye.so/token/${validAddress}?chain=solana` : '#';
        if (solscanLink) solscanLink.href = validAddress ? `https://solscan.io/token/${validAddress}` : '#';
        if (pumpfunLink) pumpfunLink.href = validAddress ? `https://pump.fun/${validAddress}` : '#';
    }

    updateSocialLinks(info) {
        const socialsEl = document.getElementById('tokenSocials');
        if (!socialsEl) return;

        const socials = [];

        if (info?.websites?.length > 0) {
            const websiteUrl = sanitizeUrl(info.websites[0].url);
            if (websiteUrl) {
                socials.push(`<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="social-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                    </svg>
                    Website
                </a>`);
            }
        }

        if (info?.socials) {
            info.socials.forEach(social => {
                const safeUrl = sanitizeUrl(social.url);
                if (safeUrl) {
                    const icon = this.getSocialIcon(social.type);
                    socials.push(`<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="social-link">${icon}${escapeHtml(social.type)}</a>`);
                }
            });
        }

        socialsEl.innerHTML = socials.length > 0
            ? socials.join('')
            : '<span class="no-socials">No social links available</span>';
    }

    getSocialIcon(type) {
        const icons = {
            twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
            telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
            discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>'
        };
        return icons[type.toLowerCase()] || '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>';
    }

    copyAddress() {
        const addressEl = document.querySelector('.address-text');
        if (!addressEl || addressEl.textContent === '---') return;

        navigator.clipboard.writeText(addressEl.textContent).then(() => {
            const copyBtn = document.getElementById('copyAddressBtn');
            if (copyBtn) {
                copyBtn.classList.add('copied');
                setTimeout(() => copyBtn.classList.remove('copied'), 2000);
            }
        });
    }

    // Utility functions
    formatNumber(num) {
        if (num === 0) return '0';
        if (num < 0.000001) return num.toExponential(2);
        if (num < 0.01) return num.toFixed(6);
        if (num < 1) return num.toFixed(4);
        if (num < 100) return num.toFixed(2);
        return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    formatCompact(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toFixed(0);
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}


// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize network background
    const canvas = document.getElementById('networkCanvas');
    if (canvas) {
        new NetworkBackground(canvas);
    }

    // Initialize navigation
    new NavigationController();

    // Initialize main application
    new NarrativeAlpha();

    // Initialize live data service (globally accessible for retry button)
    window.liveDataService = new LiveDataService();

    // Initialize Phantom wallet connection
    initWalletConnect();

    // Initialize CA copy button
    initCopyButton();
});

// Copy CA button functionality
function initCopyButton() {
    const copyBtn = document.getElementById('narrCopyBtn');
    const caEl = document.getElementById('narrContractAddress');
    if (!copyBtn || !caEl) return;

    copyBtn.addEventListener('click', async () => {
        const ca = caEl.textContent;
        try {
            await navigator.clipboard.writeText(ca);
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>`;
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
            }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    });
}

// Phantom Wallet Connection
function initWalletConnect() {
    const connectBtn = document.getElementById('connectWallet');
    const walletText = document.getElementById('walletText');
    if (!connectBtn) return;

    // Check if already connected
    const checkConnection = async () => {
        const provider = window.phantom?.solana || window.solana;
        if (provider?.isPhantom && provider.isConnected) {
            const pubkey = provider.publicKey?.toString();
            if (pubkey) {
                updateWalletUI(pubkey);
            }
        }
    };

    // Update UI when connected
    const updateWalletUI = (pubkey) => {
        const short = pubkey.slice(0, 4) + '...' + pubkey.slice(-4);
        walletText.textContent = short;
        connectBtn.classList.add('connected');
        window.connectedWallet = pubkey;
    };

    // Connect handler
    connectBtn.addEventListener('click', async () => {
        const provider = window.phantom?.solana || window.solana;

        if (!provider?.isPhantom) {
            window.open('https://phantom.app/', '_blank');
            return;
        }

        try {
            if (provider.isConnected) {
                // Disconnect
                await provider.disconnect();
                walletText.textContent = 'Connect';
                connectBtn.classList.remove('connected');
                window.connectedWallet = null;
            } else {
                // Connect
                const resp = await provider.connect();
                updateWalletUI(resp.publicKey.toString());
            }
        } catch (err) {
            console.error('Wallet connection error:', err);
        }
    });

    // Listen for account changes
    const provider = window.phantom?.solana || window.solana;
    if (provider) {
        provider.on('accountChanged', (publicKey) => {
            if (publicKey) {
                updateWalletUI(publicKey.toString());
            } else {
                walletText.textContent = 'Connect';
                connectBtn.classList.remove('connected');
            }
        });
    }

    // Check initial state
    checkConnection();
}

// $NA Token Data Fetcher
const NA_TOKEN_ADDRESS = '7cYBLLMCjuLAj4DKWZ9Vsf1zqMs9q5ofiWD3Yiigpump';

async function fetchNarrTokenData() {
    const priceEl = document.getElementById('narrPrice');
    const changeEl = document.getElementById('narrPriceChange');
    const mcapEl = document.getElementById('narrMcap');
    const volumeEl = document.getElementById('narrVolume');
    const txnsEl = document.getElementById('narrTxns');

    if (!priceEl) return; // Not on $NA page

    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${NA_TOKEN_ADDRESS}`);
        if (!response.ok) throw new Error('API error');

        const data = await response.json();
        console.log('$NA Token Data:', data); // Debug log

        if (data.pairs && data.pairs.length > 0) {
            // Use the first pair (PumpFun)
            const pair = data.pairs[0];
            console.log('Using pair:', pair); // Debug log

            // Update price
            const price = parseFloat(pair.priceUsd);
            if (price > 0) {
                priceEl.innerHTML = formatSmallPrice(price);
            }

            // Update price change
            const priceChange = pair.priceChange?.h24;
            if (priceChange !== undefined && priceChange !== null) {
                const isPositive = priceChange >= 0;
                changeEl.textContent = `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%`;
                changeEl.className = `narr-price-change ${isPositive ? 'positive' : 'negative'}`;
            }

            // Update market cap (use fdv for PumpFun tokens)
            const mcap = pair.marketCap || pair.fdv;
            if (mcap) {
                mcapEl.textContent = formatMcap(mcap);
            }

            // Update 24h volume
            const volume = pair.volume?.h24;
            if (volume) {
                volumeEl.textContent = formatNarrNumber(volume);
            }

            // Update 24h transactions
            if (pair.txns?.h24) {
                const buys = pair.txns.h24.buys || 0;
                const sells = pair.txns.h24.sells || 0;
                txnsEl.textContent = `${(buys + sells).toLocaleString()}`;
            }
        }
    } catch (error) {
        console.error('Error fetching $NA token data:', error);
    }
}

function formatNarrNumber(num) {
    if (!num) return 'TBA';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
}

function formatMcap(num) {
    if (!num) return 'TBA';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B MC`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M MC`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K MC`;
    return `${num.toFixed(0)} MC`;
}

// Format small prices with subscript zeros (like DEX Screener)
// e.g., 0.00000578 becomes $0.0₅78
function formatSmallPrice(price) {
    if (price >= 0.01) {
        return `$${price.toFixed(4)}`;
    }

    // Convert to string and count leading zeros after decimal
    const priceStr = price.toFixed(12);
    const match = priceStr.match(/^0\.(0+)/);

    if (match) {
        const zeroCount = match[1].length;
        // Get significant digits after the zeros
        const significantPart = priceStr.slice(2 + zeroCount, 2 + zeroCount + 4).replace(/0+$/, '');
        const subscript = String(zeroCount).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
        return `$0.0${subscript}${significantPart}`;
    }

    return `$${price.toFixed(6)}`;
}

// Initialize $NA data fetching
function initNarrTokenData() {
    // Fetch immediately
    fetchNarrTokenData();

    // Refresh every 30 seconds
    setInterval(fetchNarrTokenData, 30000);
}

// Call init when DOM is ready (add to existing DOMContentLoaded or call separately)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNarrTokenData);
} else {
    initNarrTokenData();
}
