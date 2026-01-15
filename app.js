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
});
