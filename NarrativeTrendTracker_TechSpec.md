# 🔮 NarrativeAlpha: AI-Powered Memecoin Narrative Tracker

## Technical Specification Document

---

## Executive Summary

**NarrativeAlpha** is an AI-powered tool that scans social media, identifies emerging memecoin narratives, and alerts users before these narratives manifest in price action on pump.fun. 

**Core Value Proposition:** "Find the next FARTCOIN before it pumps."

**Target Users:** Pump.fun traders, memecoin degens, CT (Crypto Twitter) followers

---

## Market Gap Analysis

### Current Tools & Their Limitations

| Tool | What It Does | Gap |
|------|-------------|-----|
| **LunarCrush** | Social sentiment for established coins | Doesn't track pump.fun specifically, no narrative detection |
| **Santiment** | On-chain + social metrics | Enterprise pricing, not memecoin-focused |
| **Sharpe AI** | 17+ crypto narratives tracked | Macro-level (DeFi, AI, RWA), not micro-narratives |
| **DEX Screener** | New token launches, volume | Reactive (shows what's pumping), not predictive |
| **GMGN.ai** | Solana trading signals | Copy trading focused, not narrative intelligence |

### The Opportunity

> "Every viral meme-coin has one thing in common: it blows up socially before it blows up financially." 

Current tools show you *what's already pumping*. NarrativeAlpha shows you *what's about to pump*.

---

## Feature Specification

### 1. Narrative Detection Engine

**Purpose:** Identify emerging themes/memes before they become tokens

**Data Sources:**
- Twitter/X (primary - CT is ground zero)
- Reddit (r/cryptocurrency, r/solana, r/memecoins)
- TikTok (research shows it drives short-term speculation)
- Telegram (alpha groups, pump.fun communities)
- YouTube (influencer coverage)

**Detection Methods:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    NARRATIVE DETECTION FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│  1. Keyword Velocity Tracking                                    │
│     - Monitor spike in mentions of new terms/phrases             │
│     - Compare against baseline (7-day rolling average)           │
│     - Flag terms with >3x velocity increase                      │
│                                                                  │
│  2. Influencer Signal Detection                                  │
│     - Track CT influencers (>10K followers)                      │
│     - Weight by engagement rate, not just followers              │
│     - Detect early adopter patterns                              │
│                                                                  │
│  3. Meme Image Analysis                                          │
│     - Vision AI to detect new meme templates                     │
│     - Track image replication velocity                           │
│     - Identify characters/themes before they get tickers         │
│                                                                  │
│  4. Cross-Platform Correlation                                   │
│     - Same meme appearing on X → Reddit → TikTok = signal        │
│     - Faster spread = stronger signal                            │
│                                                                  │
│  5. AI Summarization                                             │
│     - GPT/Claude analyzes cluster of posts                       │
│     - Generates "narrative brief" explaining the theme           │
│     - Assigns confidence score (0-100)                           │
└─────────────────────────────────────────────────────────────────┘
```

**Output Example:**
```json
{
  "narrative": "Minecraft Grandma",
  "confidence": 87,
  "velocity_score": 4.2,
  "first_detected": "2025-01-10T14:32:00Z",
  "summary": "81-year-old grandmother livestreaming Minecraft to fund grandson's cancer treatment. Emotional story going viral on TikTok and CT.",
  "key_influencers": ["@cobie", "@hsaka", "@deaboroskis"],
  "platforms": {
    "twitter": 2340,
    "tiktok": 890000,
    "reddit": 156
  },
  "suggested_tickers": ["GRANDMA", "MINECRAFT", "GRANNY"],
  "related_tokens": [
    {"name": "Minecraft Grandma Fund", "address": "xxx...pump", "mcap": "$5.6M"}
  ],
  "alert_level": "HIGH"
}
```

---

### 2. Pump.fun Token Matcher

**Purpose:** Connect narratives to actual pump.fun tokens in real-time

**Features:**
- Scans new token launches on pump.fun (via API/websocket)
- Matches token names/descriptions to detected narratives
- Shows time delta between narrative detection and token creation
- Tracks which narratives already have tokens vs. untapped

**API Integration:**
```
- Moralis Pump.fun API (token metadata, prices, bonding curve)
- BitQuery (historical trades, whale tracking)
- PumpPortal (real-time token creation)
- pump.fun internal API (if available)
```

**Token Scoring:**
```
NARRATIVE_FIT_SCORE = (
  name_match * 0.3 +
  description_relevance * 0.2 +
  timing_bonus * 0.2 +      # Created within 2hrs of narrative spike
  creator_history * 0.15 +   # Previous successful launches
  early_holder_quality * 0.15  # Smart money wallets in first 100 buyers
)
```

---

### 3. Alpha Alert System

**Delivery Channels:**
- Telegram Bot (primary - fastest for traders)
- Discord Webhook
- Web Dashboard
- Email (for daily digest)

**Alert Types:**

| Alert | Trigger | Urgency |
|-------|---------|---------|
| 🟢 **New Narrative** | Confidence > 60, no existing tokens | Medium |
| 🟡 **Token Match** | New token matches detected narrative | High |
| 🔴 **Velocity Spike** | Narrative velocity > 5x in 1hr | Urgent |
| 🟣 **Smart Money** | Known profitable wallets buying narrative token | Urgent |
| ⚪ **Narrative Death** | Engagement dropped > 70% | Informational |

**Telegram Bot Commands:**
```
/narratives - Show top 10 emerging narratives
/alerts on/off - Toggle real-time alerts
/track <keyword> - Add custom keyword to watch
/token <address> - Get narrative context for token
/history - Your alert history & hit rate
```

---

### 4. Narrative Lifecycle Dashboard

**Web Interface Features:**

**A. Live Narrative Feed**
- Card-based UI showing emerging narratives
- Sortable by: Confidence, Velocity, Time, Platform
- Filter by: Has Token, No Token, Alert Level

**B. Narrative Detail View**
- Timeline of mentions (chart)
- Key tweets/posts embedded
- Related tokens with price charts
- AI-generated "narrative brief"
- Predicted lifespan (based on similar patterns)

**C. Historical Analysis**
- Past narratives and outcomes
- "What happened to X narrative"
- Success rate tracking (did we call it early?)

**D. Leaderboard**
- Track which narratives hit 100x
- Show detection-to-peak time
- User performance (if they acted on alerts)

---

## Technical Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DATA INGESTION LAYER                          │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Twitter │  │ Reddit  │  │ TikTok  │  │Telegram │  │ YouTube │    │
│  │   API   │  │   API   │  │ Scraper │  │   Bot   │  │   API   │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │            │          │
│       └────────────┴────────────┴────────────┴────────────┘          │
│                                  │                                    │
│                          ┌───────▼───────┐                           │
│                          │  Message Queue │                           │
│                          │   (Redis/SQS)  │                           │
│                          └───────┬───────┘                           │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                         PROCESSING LAYER                              │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│  │  NLP Pipeline   │    │  Vision AI      │    │  Velocity Calc  │   │
│  │  (Embeddings)   │    │  (Meme Detect)  │    │  (Time Series)  │   │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘   │
│           │                      │                      │            │
│           └──────────────────────┴──────────────────────┘            │
│                                  │                                    │
│                          ┌───────▼───────┐                           │
│                          │  AI Narrative  │                           │
│                          │   Synthesizer  │                           │
│                          │  (Claude API)  │                           │
│                          └───────┬───────┘                           │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                         TOKEN MATCHING LAYER                          │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│  │  Pump.fun API   │    │  Moralis API    │    │  Wallet Tracker │   │
│  │  (New Tokens)   │    │  (Metadata)     │    │  (Smart Money)  │   │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘   │
│           └──────────────────────┴──────────────────────┘            │
│                                  │                                    │
│                          ┌───────▼───────┐                           │
│                          │  Token Scorer  │                           │
│                          │  & Matcher     │                           │
│                          └───────┬───────┘                           │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                         OUTPUT LAYER                                  │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Telegram   │  │  Discord    │  │    Web      │  │   Email     │  │
│  │    Bot      │  │  Webhook    │  │  Dashboard  │  │   Digest    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                         DATA STORAGE                                  │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│  │   PostgreSQL    │    │     Redis       │    │    S3/R2        │   │
│  │  (Narratives,   │    │  (Real-time     │    │  (Images,       │   │
│  │   Users, Alerts)│    │   Velocities)   │    │   Embeddings)   │   │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Tech Stack Recommendation

**Backend:**
- **Language:** Python (for AI/ML) + Node.js (for real-time)
- **Framework:** FastAPI (Python) + Express (Node)
- **Queue:** Redis Streams or AWS SQS
- **Database:** PostgreSQL (structured) + Redis (real-time)
- **Vector DB:** Pinecone or Weaviate (for semantic search)

**AI/ML:**
- **Embeddings:** OpenAI `text-embedding-3-small` or Cohere
- **LLM:** Claude API (for narrative synthesis)
- **Vision:** GPT-4V or Claude Vision (meme detection)
- **Classification:** Fine-tuned BERT for crypto sentiment

**Frontend:**
- **Web:** Next.js + Tailwind + shadcn/ui
- **Charts:** Recharts or Lightweight Charts
- **Real-time:** Socket.io or Pusher

**Infrastructure:**
- **Hosting:** Railway, Vercel, or AWS
- **CDN:** Cloudflare
- **Monitoring:** Sentry + Datadog

---

## Data Sources & APIs

### Social Media

| Platform | Method | Rate Limits | Cost |
|----------|--------|-------------|------|
| Twitter/X | Official API v2 | 500K tweets/mo (Basic) | $100/mo |
| Reddit | Official API | 100 req/min | Free |
| TikTok | Unofficial scraper | Varies | ~$50/mo (proxy costs) |
| Telegram | Bot API + MTProto | 30 msg/sec | Free |
| YouTube | Data API v3 | 10K units/day | Free |

### Blockchain/Token Data

| API | Purpose | Pricing |
|-----|---------|---------|
| **Moralis** | Pump.fun token metadata, prices | Free tier + $49/mo |
| **BitQuery** | Historical trades, SQL queries | Pay per query |
| **PumpPortal** | Token creation, fast trades | Free |
| **Helius** | Solana RPC, webhooks | Free tier + usage |
| **DexScreener** | Token charts, trending | Free API |

---

## Monetization Strategy

### Freemium Model

**Free Tier:**
- 5 narrative alerts per day
- 24-hour delay on new narratives
- Basic Telegram bot access
- Web dashboard (limited history)

**Pro Tier ($29/mo):**
- Unlimited real-time alerts
- Full narrative history
- Custom keyword tracking (10 keywords)
- Discord integration
- Priority support

**Alpha Tier ($99/mo):**
- Everything in Pro
- Smart money wallet alerts
- API access
- Custom Telegram bot instance
- Early access to new features
- Private Discord channel

**Enterprise/Whale ($499/mo):**
- White-label solution
- Unlimited API calls
- Custom AI model fine-tuning
- Dedicated support
- On-call integration help

### Additional Revenue Streams

1. **Referral fees** from trading bots (GMGN, BullX partnerships)
2. **Sponsored narratives** (projects pay for visibility) - clearly labeled
3. **Data licensing** to hedge funds/trading firms
4. **NFT pass** for lifetime access (one-time payment)

---

## Development Roadmap

### Phase 1: MVP (4-6 weeks)
- [ ] Twitter scraper + basic NLP
- [ ] Pump.fun API integration
- [ ] Telegram bot with alerts
- [ ] Simple web dashboard
- [ ] Manual narrative labeling

### Phase 2: Intelligence (6-8 weeks)
- [ ] Reddit + TikTok integration
- [ ] Claude API for narrative synthesis
- [ ] Velocity scoring system
- [ ] Historical pattern matching
- [ ] Smart money wallet tracking

### Phase 3: Scale (8-12 weeks)
- [ ] Vision AI for meme detection
- [ ] Prediction scoring (backtested)
- [ ] User accounts + subscription
- [ ] Discord bot
- [ ] Mobile app (React Native)

### Phase 4: Moat Building
- [ ] Proprietary embedding model
- [ ] CT influencer relationship scoring
- [ ] Cross-chain support (Base, BNB)
- [ ] Trading bot integration
- [ ] Community features

---

## Competitive Moat

**What makes NarrativeAlpha defensible:**

1. **First-mover in pump.fun-specific narrative tracking**
2. **Proprietary dataset** of narrative → token outcomes
3. **Fine-tuned AI models** for crypto/meme context
4. **Network effects** - more users = better signals
5. **Brand in CT** - becoming the go-to "narrative alpha" source

---

## Risk Considerations

| Risk | Mitigation |
|------|------------|
| Twitter API costs/limits | Multi-source approach, caching |
| False positives (bad calls) | Confidence scoring, historical validation |
| Platform TOS violations | Comply with APIs, avoid scraping where possible |
| Competition from GMGN etc. | Focus on narrative prediction, not trading |
| Market conditions (bear market) | Narratives exist in all markets, pivot to macro |

---

## Success Metrics

**North Star:** Time-to-detection (how early do we catch narratives?)

**KPIs:**
- Narrative detection → token creation (avg time)
- Alert → 10x price (hit rate)
- User retention (30-day)
- Paid conversion rate
- Twitter mentions/brand awareness

---

## Next Steps

1. **Validate demand:** Tweet thread announcing the concept, gauge interest
2. **Build Twitter scraper:** Start collecting data immediately
3. **Manual MVP:** Personally identify narratives for 2 weeks, test thesis
4. **Telegram bot alpha:** Release to 50 beta users
5. **Iterate based on feedback**

---

## Appendix: Example Narratives (2025)

| Narrative | Origin | First Token | Peak MCap | Detection Window |
|-----------|--------|-------------|-----------|------------------|
| Minecraft Grandma | TikTok | GRANDMA | $5.6M | ~4 hours |
| AI Agents | Truth Terminal | GOAT | $1.2B | ~2 weeks |
| FARTCOIN | AI bot tweets | FARTCOIN | $2B | ~12 hours |
| Gen Z Quant | Livestream rug | QUANT | $85M | ~30 min |
| Trump Coin | Inauguration | TRUMP | $14B | ~Immediate |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Claude (with Rog)*
