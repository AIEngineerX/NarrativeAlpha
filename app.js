/**
 * NarrativeAlpha - AI-Powered Memecoin Narrative Intelligence
 * Main Application Script
 */

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
        this.populateSampleSignals();
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

    populateSampleSignals() {
        const signals = [
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
            },
            {
                type: 'bullish',
                title: 'Gaming x Crypto crossover gaining traction on CT',
                time: '1h 15m ago',
                confidence: 68,
                velocity: '2.4x'
            },
            {
                type: 'bearish',
                title: 'Celebrity token launches showing fatigue signs',
                time: '2h ago',
                confidence: 61,
                velocity: '1.2x'
            },
            {
                type: 'bullish',
                title: 'RWA tokenization narrative picking up steam',
                time: '2h 30m ago',
                confidence: 74,
                velocity: '3.1x'
            },
            {
                type: 'neutral',
                title: 'Layer 2 competition heating up - rotation possible',
                time: '3h ago',
                confidence: 55,
                velocity: '1.8x'
            },
            {
                type: 'bullish',
                title: 'Solana ecosystem tokens showing coordinated momentum',
                time: '4h ago',
                confidence: 82,
                velocity: '4.2x'
            },
            {
                type: 'bearish',
                title: 'Meme coin sector cooling - potential correction ahead',
                time: '5h ago',
                confidence: 58,
                velocity: '0.8x'
            },
            {
                type: 'bullish',
                title: 'New pump.fun meta: animal hybrids gaining attention',
                time: '6h ago',
                confidence: 63,
                velocity: '2.6x'
            },
            {
                type: 'neutral',
                title: 'Cross-chain bridge narrative emerging slowly',
                time: '8h ago',
                confidence: 48,
                velocity: '1.4x'
            }
        ];

        this.elements.signalsFeed.innerHTML = signals.map(signal => `
            <div class="signal-card" data-type="${signal.type}">
                <div class="signal-header">
                    <span class="signal-type ${signal.type}">${signal.type.toUpperCase()}</span>
                    <span class="signal-time">${signal.time}</span>
                </div>
                <div class="signal-title">${signal.title}</div>
                <div class="signal-meta">
                    <span class="signal-confidence">Confidence: ${signal.confidence}%</span>
                    <span class="signal-velocity">Velocity: ${signal.velocity}</span>
                </div>
            </div>
        `).join('');
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
        // Call the Netlify serverless function
        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
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

        // Main prediction
        this.elements.mainPrediction.innerHTML = `
            <h3 style="color: var(--accent-cyan); margin-bottom: 0.75rem; font-size: 1.25rem;">${data.narrative_name}</h3>
            <p>${data.summary}</p>
        `;

        // Alert level
        const alertLevel = data.alert_level || 'MEDIUM';
        this.elements.alertLevel.textContent = alertLevel;
        this.elements.alertLevel.className = 'card-badge ' + alertLevel.toLowerCase();

        // Confidence gauge
        const confidence = data.confidence || 50;
        this.animateConfidence(confidence);

        // Velocity
        const velocity = data.velocity_score || 1.0;
        this.elements.velocityValue.textContent = velocity.toFixed(1) + 'x';
        const velocityPercent = Math.min((velocity / 10) * 100, 100);
        this.elements.velocityFill.style.width = velocityPercent + '%';

        // Catalysts
        this.elements.catalysts.innerHTML = this.formatList(data.catalysts || []);

        // Tickers
        this.elements.tickers.innerHTML = (data.suggested_tickers || [])
            .map(t => `<span class="ticker-tag">$${t}</span>`)
            .join('');

        // Risks
        this.elements.risks.innerHTML = this.formatList(data.risk_vectors || []);

        // Timeline
        this.elements.timeline.innerHTML = `<p>${data.timeline || 'Analysis in progress...'}</p>`;

        // Actionable intel
        this.elements.actionable.innerHTML = `<p>${data.actionable_intel || 'No specific actions recommended at this time.'}</p>`;
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
        return '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
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
            if (filter === 'all') {
                card.style.display = 'block';
            } else if (filter === 'urgent') {
                // Show high confidence bullish signals as "urgent"
                const confidence = parseInt(card.querySelector('.signal-confidence').textContent.match(/\d+/)[0]);
                card.style.display = confidence >= 70 ? 'block' : 'none';
            } else {
                card.style.display = card.dataset.type === filter ? 'block' : 'none';
            }
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
        this.dexScreenerBaseUrl = 'https://api.dexscreener.com/latest/dex';
        this.updateInterval = 30000; // 30 seconds
        this.intervalId = null;
        this.currentTokenAddress = null;
        this.cachedTrendingTokens = [];

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
        this.fetchTrendingTokens();
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
        this.intervalId = setInterval(() => {
            this.fetchTrendingTokens();
        }, this.updateInterval);
    }

    stopAutoRefresh() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    updateLastUpdateTime() {
        if (this.elements.lastUpdateTime) {
            const now = new Date();
            this.elements.lastUpdateTime.textContent = `Updated ${now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })}`;
        }
    }

    // Fetch trending tokens from DEX Screener
    async fetchTrendingTokens() {
        try {
            // Use DEX Screener's token boosts/trending endpoint for Solana
            // This gets the most active pairs on Solana chain
            const response = await fetch(`${this.dexScreenerBaseUrl}/pairs/solana`);

            if (!response.ok) {
                throw new Error('Failed to fetch from DEX Screener');
            }

            const data = await response.json();
            let allPairs = data.pairs || [];

            // Also fetch from the boosted tokens endpoint for trending tokens
            try {
                const boostResponse = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
                if (boostResponse.ok) {
                    const boostData = await boostResponse.json();
                    // Filter for Solana boosted tokens
                    const solanaBoosts = (boostData || []).filter(t => t.chainId === 'solana');

                    // Fetch details for boosted tokens
                    for (const boost of solanaBoosts.slice(0, 10)) {
                        try {
                            const tokenResponse = await fetch(`${this.dexScreenerBaseUrl}/tokens/${boost.tokenAddress}`);
                            if (tokenResponse.ok) {
                                const tokenData = await tokenResponse.json();
                                if (tokenData.pairs) {
                                    allPairs = [...allPairs, ...tokenData.pairs];
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to fetch boosted token:', e);
                        }
                    }
                }
            } catch (e) {
                console.warn('Boost endpoint unavailable:', e);
            }

            // Process and deduplicate
            const processedTokens = this.processTokenData(allPairs);

            this.cachedTrendingTokens = processedTokens;
            this.renderSignalsFeed(processedTokens);
            this.renderTrendingTokens(processedTokens.slice(0, 8));
            this.updateLastUpdateTime();

        } catch (error) {
            console.error('Error fetching trending tokens:', error);
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
            const liquidity = parseFloat(pair.liquidity?.usd || 0);
            const marketCap = parseFloat(pair.fdv || pair.marketCap || 0);
            const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
            const buyRatio = pair.txns?.h24?.buys && pair.txns?.h24?.sells
                ? pair.txns.h24.buys / (pair.txns.h24.buys + pair.txns.h24.sells)
                : 0.5;

            // Skip tokens with very low liquidity (rug risk) or no volume
            if (liquidity < 5000 || volume24h < 1000) continue;

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

            processed.push({
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
                liquidity,
                marketCap,
                txns24h,
                buyRatio,
                pairAddress: pair.pairAddress,
                dexId: pair.dexId,
                signalType,
                isUrgent,
                confidence,
                velocity,
                heatScore,
                createdAt: pair.pairCreatedAt,
                url: pair.url,
                info: pair.info || {}
            });
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

        // Add click handlers to signal cards
        this.elements.signalsFeed.querySelectorAll('.signal-card').forEach(card => {
            card.addEventListener('click', () => {
                const address = card.dataset.address;
                if (address) {
                    this.loadTokenDetails(address);
                    // Navigate to chart section
                    document.querySelector('.nav-link[data-section="chart"]')?.click();
                }
            });
        });
    }

    createSignalCard(token) {
        const priceChange24hClass = token.priceChange24h >= 0 ? 'positive' : 'negative';
        const priceChange24hSign = token.priceChange24h >= 0 ? '+' : '';
        const priceChange1hClass = token.priceChange1h >= 0 ? 'positive' : 'negative';
        const priceChange1hSign = token.priceChange1h >= 0 ? '+' : '';
        const urgentClass = token.isUrgent ? 'urgent' : '';

        const timeAgo = token.createdAt ? this.getTimeAgo(token.createdAt) : 'Active';
        const source = token.dexId === 'raydium' ? 'Raydium' :
                       token.dexId === 'orca' ? 'Orca' :
                       token.dexId === 'meteora' ? 'Meteora' : 'PumpFun';

        // Buy pressure indicator
        const buyPressure = Math.round(token.buyRatio * 100);
        const buyPressureClass = buyPressure > 55 ? 'positive' : buyPressure < 45 ? 'negative' : '';

        return `
            <div class="signal-card ${urgentClass}" data-type="${token.signalType}" data-address="${token.address}">
                <div class="signal-header">
                    <span class="signal-type ${token.signalType}">${token.signalType.toUpperCase()}</span>
                    <span class="signal-source">${source}</span>
                    <span class="signal-time">${timeAgo}</span>
                </div>
                <div class="signal-title">
                    <strong>$${token.symbol}</strong> - ${token.name}
                </div>
                <div class="signal-meta">
                    <span class="signal-confidence">Confidence: ${token.confidence}%</span>
                    <span class="signal-velocity">Velocity: ${token.velocity}x</span>
                </div>
                <div class="signal-stats">
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatNumber(token.price)}</span>
                        <span class="signal-stat-label">Price</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value ${priceChange1hClass}">${priceChange1hSign}${token.priceChange1h.toFixed(1)}%</span>
                        <span class="signal-stat-label">1h Change</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value ${priceChange24hClass}">${priceChange24hSign}${token.priceChange24h.toFixed(1)}%</span>
                        <span class="signal-stat-label">24h Change</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatCompact(token.volume24h)}</span>
                        <span class="signal-stat-label">24h Vol</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value">$${this.formatCompact(token.liquidity)}</span>
                        <span class="signal-stat-label">Liquidity</span>
                    </div>
                    <div class="signal-stat">
                        <span class="signal-stat-value ${buyPressureClass}">${buyPressure}%</span>
                        <span class="signal-stat-label">Buy Press</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderTrendingTokens(tokens) {
        if (!this.elements.trendingTokensList) return;

        const html = tokens.map(token => {
            const changeClass = token.priceChange24h >= 0 ? 'positive' : 'negative';
            const changeSign = token.priceChange24h >= 0 ? '+' : '';
            return `
                <span class="quick-token" data-address="${token.address}">
                    $${token.symbol}
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
        // Use cached or sample data when API fails
        const fallbackSignals = CONFIG.SAMPLE_NARRATIVES || [
            { type: 'bullish', title: 'AI Agent Infrastructure narrative gaining momentum', time: '2m ago', confidence: 78, velocity: '3.2x' },
            { type: 'bullish', title: 'New memecoin meta emerging around viral TikTok trend', time: '15m ago', confidence: 65, velocity: '2.1x' },
            { type: 'neutral', title: 'DePIN sector showing early rotation signals', time: '32m ago', confidence: 52, velocity: '1.5x' },
            { type: 'bullish', title: 'CT influencers coordinating on new narrative play', time: '1h ago', confidence: 71, velocity: '2.8x' }
        ];

        if (this.elements.signalsFeed) {
            this.elements.signalsFeed.innerHTML = fallbackSignals.map(signal => `
                <div class="signal-card" data-type="${signal.type}">
                    <div class="signal-header">
                        <span class="signal-type ${signal.type}">${signal.type.toUpperCase()}</span>
                        <span class="signal-time">${signal.time}</span>
                    </div>
                    <div class="signal-title">${signal.title}</div>
                    <div class="signal-meta">
                        <span class="signal-confidence">Confidence: ${signal.confidence}%</span>
                        <span class="signal-velocity">Velocity: ${signal.velocity}</span>
                    </div>
                </div>
            `).join('');
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
            const response = await fetch(`${this.dexScreenerBaseUrl}/search?q=${encodeURIComponent(query)}`);
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
            // Fetch token data from DEX Screener
            const response = await fetch(`${this.dexScreenerBaseUrl}/tokens/${address}`);
            if (!response.ok) throw new Error('Token not found');

            const data = await response.json();
            const pairs = data.pairs || [];

            if (pairs.length === 0) {
                throw new Error('No trading pairs found for this token');
            }

            // Use the most liquid pair
            const primaryPair = pairs.sort((a, b) =>
                (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];

            this.updateTokenDisplay(primaryPair, pairs);
            this.updateChartEmbed(address, primaryPair.pairAddress);
            this.updateExternalLinks(address, primaryPair);

            // Update search input
            if (this.elements.tokenSearchInput) {
                this.elements.tokenSearchInput.value = address;
            }

        } catch (error) {
            console.error('Error loading token:', error);
            alert(`Could not load token: ${error.message}`);
        }
    }

    updateTokenDisplay(pair, allPairs) {
        // Token identity
        const logoEl = document.getElementById('tokenLogo');
        const nameEl = document.getElementById('tokenName');
        const symbolEl = document.getElementById('tokenSymbol');

        if (logoEl) {
            logoEl.src = pair.info?.imageUrl || '';
            logoEl.style.display = pair.info?.imageUrl ? 'block' : 'none';
        }
        if (nameEl) nameEl.textContent = pair.baseToken?.name || 'Unknown Token';
        if (symbolEl) symbolEl.textContent = `$${pair.baseToken?.symbol || '???'}`;

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

        const reasons = [];
        const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
        const priceChange1h = parseFloat(pair.priceChange?.h1 || 0);
        const priceChange5m = parseFloat(pair.priceChange?.m5 || 0);
        const volume24h = parseFloat(pair.volume?.h24 || 0);
        const volume1h = parseFloat(pair.volume?.h1 || 0);
        const liquidity = parseFloat(pair.liquidity?.usd || 0);
        const mcap = parseFloat(pair.fdv || pair.marketCap || 0);
        const volumeLiqRatio = liquidity > 0 ? volume24h / liquidity : 0;
        const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
        const buys24h = pair.txns?.h24?.buys || 0;
        const sells24h = pair.txns?.h24?.sells || 0;
        const buyRatio = txns24h > 0 ? buys24h / txns24h : 0.5;

        // Recent momentum signals (most important for degens)
        if (priceChange5m > 15) {
            reasons.push(`<span class="positive">PUMPING NOW:</span> +${priceChange5m.toFixed(0)}% in last 5 minutes`);
        } else if (priceChange5m < -15) {
            reasons.push(`<span class="negative">DUMPING NOW:</span> ${priceChange5m.toFixed(0)}% in last 5 minutes`);
        }

        if (priceChange1h > 30) {
            reasons.push(`<span class="positive">Strong 1h momentum:</span> +${priceChange1h.toFixed(0)}% - could be early`);
        } else if (priceChange1h > 10 && priceChange5m > 0) {
            reasons.push(`Steady climb: +${priceChange1h.toFixed(0)}% 1h with continued buying`);
        }

        // 24h performance context
        if (priceChange24h > 100) {
            reasons.push(`<span class="positive">MOON ALERT:</span> +${priceChange24h.toFixed(0)}% in 24h - potential multibagger`);
        } else if (priceChange24h > 50) {
            reasons.push(`Major pump: +${priceChange24h.toFixed(0)}% in 24h - watch for continuation or pullback`);
        } else if (priceChange24h < -40) {
            reasons.push(`<span class="negative">Heavy dump:</span> ${priceChange24h.toFixed(0)}% - dip or dead cat?`);
        } else if (priceChange24h < -20 && priceChange1h > 5) {
            reasons.push(`Potential reversal: Recovering after ${priceChange24h.toFixed(0)}% dump`);
        }

        // Volume analysis
        if (volume1h > 100000) {
            reasons.push(`<span class="positive">High 1h volume:</span> $${this.formatCompact(volume1h)} - active trading`);
        }
        if (volume24h > 1000000) {
            reasons.push(`Whale activity: $${this.formatCompact(volume24h)} 24h volume`);
        }

        // Velocity (key degen metric)
        if (volumeLiqRatio > 10) {
            reasons.push(`<span class="positive">EXTREME velocity:</span> ${volumeLiqRatio.toFixed(1)}x vol/liq - heavy rotation`);
        } else if (volumeLiqRatio > 5) {
            reasons.push(`High velocity: ${volumeLiqRatio.toFixed(1)}x volume to liquidity ratio`);
        }

        // Buy pressure
        if (buyRatio > 0.65) {
            reasons.push(`<span class="positive">Strong buy pressure:</span> ${Math.round(buyRatio * 100)}% buys vs sells`);
        } else if (buyRatio < 0.35) {
            reasons.push(`<span class="negative">Sell pressure:</span> Only ${Math.round(buyRatio * 100)}% buys - distribution phase?`);
        }

        // Liquidity warnings
        if (liquidity < 20000) {
            reasons.push(`<span class="negative">DANGER:</span> Only $${this.formatCompact(liquidity)} liquidity - extreme slippage`);
        } else if (liquidity < 50000) {
            reasons.push(`<span class="negative">Low liquidity:</span> $${this.formatCompact(liquidity)} - caution with size`);
        } else if (liquidity > 500000) {
            reasons.push(`Deep liquidity: $${this.formatCompact(liquidity)} - can handle larger trades`);
        }

        // Market cap context
        if (mcap > 0 && mcap < 100000) {
            reasons.push(`Micro cap: $${this.formatCompact(mcap)} FDV - high risk/reward`);
        } else if (mcap > 0 && mcap < 1000000) {
            reasons.push(`Low cap gem: $${this.formatCompact(mcap)} FDV - room to run?`);
        }

        // Age indicator
        if (pair.pairCreatedAt) {
            const ageHours = (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60);
            if (ageHours < 1) {
                reasons.push(`<span class="positive">JUST LAUNCHED:</span> Less than 1 hour old`);
            } else if (ageHours < 6) {
                reasons.push(`Fresh launch: ${ageHours.toFixed(0)} hours old - early entry window`);
            } else if (ageHours < 24) {
                reasons.push(`New token: ${ageHours.toFixed(0)} hours since launch`);
            }
        }

        // Transaction activity
        if (txns24h > 10000) {
            reasons.push(`Viral activity: ${this.formatCompact(txns24h)} transactions in 24h`);
        } else if (txns24h > 5000) {
            reasons.push(`High engagement: ${this.formatCompact(txns24h)} transactions`);
        } else if (txns24h < 100 && volume24h > 50000) {
            reasons.push(`<span class="negative">Low txn count:</span> Possible whale manipulation`);
        }

        if (reasons.length === 0) {
            reasons.push('Moderate activity - no significant alpha signals detected');
        }

        reasonsEl.innerHTML = '<ul>' + reasons.map(r => `<li>${r}</li>`).join('') + '</ul>';
    }

    updateChartEmbed(tokenAddress, pairAddress) {
        if (!this.elements.chartEmbed) return;

        // Use DEX Screener embed
        const embedUrl = pairAddress
            ? `https://dexscreener.com/solana/${pairAddress}?embed=1&theme=dark&trades=0&info=0`
            : `https://dexscreener.com/solana/${tokenAddress}?embed=1&theme=dark&trades=0&info=0`;

        this.elements.chartEmbed.innerHTML = `
            <iframe
                src="${embedUrl}"
                title="DEX Screener Chart"
                loading="lazy"
            ></iframe>
        `;
    }

    updateExternalLinks(address, pair) {
        const pairAddress = pair?.pairAddress || address;

        const dexLink = document.getElementById('linkDexScreener');
        const birdeyeLink = document.getElementById('linkBirdeye');
        const solscanLink = document.getElementById('linkSolscan');
        const pumpfunLink = document.getElementById('linkPumpFun');

        if (dexLink) dexLink.href = `https://dexscreener.com/solana/${pairAddress}`;
        if (birdeyeLink) birdeyeLink.href = `https://birdeye.so/token/${address}?chain=solana`;
        if (solscanLink) solscanLink.href = `https://solscan.io/token/${address}`;
        if (pumpfunLink) pumpfunLink.href = `https://pump.fun/${address}`;
    }

    updateSocialLinks(info) {
        const socialsEl = document.getElementById('tokenSocials');
        if (!socialsEl) return;

        const socials = [];

        if (info?.websites?.length > 0) {
            socials.push(`<a href="${info.websites[0].url}" target="_blank" class="social-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                Website
            </a>`);
        }

        if (info?.socials) {
            info.socials.forEach(social => {
                const icon = this.getSocialIcon(social.type);
                socials.push(`<a href="${social.url}" target="_blank" class="social-link">${icon}${social.type}</a>`);
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

    // Initialize live data service
    new LiveDataService();
});
