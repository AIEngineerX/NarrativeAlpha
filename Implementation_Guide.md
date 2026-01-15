# 🚀 NarrativeAlpha: Quick-Start Implementation Guide

## Getting Started in 1 Weekend

This guide gets you from zero to a working MVP. We'll build the core: Twitter scraping → narrative detection → Telegram alerts.

---

## Project Structure

```
narrative-alpha/
├── src/
│   ├── scrapers/
│   │   ├── twitter.py          # Twitter/X data collection
│   │   ├── reddit.py           # Reddit scraper
│   │   └── pumpfun.py          # Pump.fun token watcher
│   ├── analysis/
│   │   ├── velocity.py         # Keyword velocity tracking
│   │   ├── narrative.py        # AI narrative synthesis
│   │   └── matcher.py          # Token-narrative matching
│   ├── alerts/
│   │   ├── telegram_bot.py     # Telegram bot
│   │   └── discord.py          # Discord webhook
│   ├── db/
│   │   └── models.py           # Database models
│   └── api/
│       └── main.py             # FastAPI endpoints
├── web/                        # Next.js dashboard
├── docker-compose.yml
├── .env.example
└── requirements.txt
```

---

## Step 1: Environment Setup

### requirements.txt
```
# Core
fastapi==0.109.0
uvicorn==0.27.0
python-dotenv==1.0.0
httpx==0.26.0
asyncio==3.4.3

# Database
sqlalchemy==2.0.25
asyncpg==0.29.0
redis==5.0.1

# AI/NLP
openai==1.12.0
anthropic==0.18.0
sentence-transformers==2.3.1

# Twitter
tweepy==4.14.0

# Telegram
python-telegram-bot==20.7

# Utilities
pydantic==2.5.3
loguru==0.7.2
```

### .env.example
```bash
# Twitter API
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# AI
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_claude_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/narrative_alpha
REDIS_URL=redis://localhost:6379

# Pump.fun / Solana
MORALIS_API_KEY=your_moralis_key
HELIUS_API_KEY=your_helius_key
```

---

## Step 2: Twitter Scraper

### src/scrapers/twitter.py
```python
import os
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict
import tweepy
from loguru import logger

class TwitterScraper:
    """
    Scrapes Twitter for crypto/memecoin keywords and tracks velocity.
    """
    
    # Keywords that indicate memecoin discussion
    BASE_KEYWORDS = [
        "pump.fun", "pumpfun", "solana memecoin", "degen", 
        "aping", "bonding curve", "graduated", "100x",
        "new meta", "narrative", "CT", "trenches"
    ]
    
    # Influencers to monitor (add more CT accounts)
    CT_INFLUENCERS = [
        "coaboroskis", "blaboroskis", "hsaka", "cobie",
        "MustStopMurad", "ansloaemia", "0xfastcoffee"
    ]
    
    def __init__(self):
        self.client = tweepy.Client(
            bearer_token=os.getenv("TWITTER_BEARER_TOKEN"),
            wait_on_rate_limit=True
        )
        self.keyword_counts = defaultdict(list)  # keyword -> [(timestamp, count)]
        
    async def search_recent(self, query: str, max_results: int = 100) -> list:
        """
        Search recent tweets for a query.
        """
        try:
            tweets = self.client.search_recent_tweets(
                query=f"{query} -is:retweet lang:en",
                max_results=max_results,
                tweet_fields=["created_at", "public_metrics", "author_id"],
                expansions=["author_id"],
                user_fields=["public_metrics"]
            )
            return tweets.data or []
        except Exception as e:
            logger.error(f"Twitter search error: {e}")
            return []
    
    async def scan_keywords(self) -> dict:
        """
        Scan all base keywords and return counts.
        """
        results = {}
        for keyword in self.BASE_KEYWORDS:
            tweets = await self.search_recent(keyword)
            count = len(tweets)
            engagement = sum(
                t.public_metrics.get("like_count", 0) + 
                t.public_metrics.get("retweet_count", 0) * 2
                for t in tweets
            )
            results[keyword] = {
                "count": count,
                "engagement": engagement,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Track for velocity calculation
            self.keyword_counts[keyword].append((datetime.utcnow(), count))
            
            # Keep only last 24 hours
            cutoff = datetime.utcnow() - timedelta(hours=24)
            self.keyword_counts[keyword] = [
                (ts, c) for ts, c in self.keyword_counts[keyword] 
                if ts > cutoff
            ]
            
        return results
    
    def calculate_velocity(self, keyword: str, window_hours: int = 1) -> float:
        """
        Calculate velocity (rate of change) for a keyword.
        Velocity > 2x baseline = interesting
        Velocity > 5x baseline = alert-worthy
        """
        data = self.keyword_counts.get(keyword, [])
        if len(data) < 2:
            return 1.0
            
        now = datetime.utcnow()
        recent_window = now - timedelta(hours=window_hours)
        baseline_start = now - timedelta(hours=24)
        baseline_end = now - timedelta(hours=window_hours)
        
        recent = [c for ts, c in data if ts > recent_window]
        baseline = [c for ts, c in data if baseline_start < ts < baseline_end]
        
        if not baseline or sum(baseline) == 0:
            return 1.0
            
        recent_avg = sum(recent) / len(recent) if recent else 0
        baseline_avg = sum(baseline) / len(baseline)
        
        return recent_avg / baseline_avg if baseline_avg > 0 else 1.0
    
    async def find_emerging_terms(self) -> list:
        """
        Find new terms that are spiking but weren't common before.
        This is where AI helps - we look at *what* people are talking about.
        """
        # Search for generic memecoin discussion
        tweets = await self.search_recent("solana memecoin OR pump.fun", max_results=100)
        
        # Extract potential narrative keywords (simplified - use NLP in prod)
        all_text = " ".join(t.text.lower() for t in tweets)
        
        # Look for capitalized words that might be token names
        import re
        potential_tickers = re.findall(r'\$([A-Z]{2,10})', " ".join(t.text for t in tweets))
        
        # Look for repeated phrases
        words = all_text.split()
        word_freq = defaultdict(int)
        for word in words:
            if len(word) > 3 and word.isalpha():
                word_freq[word] += 1
        
        # Filter to unusual terms (not in base keywords)
        emerging = [
            (word, freq) for word, freq in word_freq.items()
            if freq > 5 and word not in [k.lower() for k in self.BASE_KEYWORDS]
        ]
        
        return sorted(emerging, key=lambda x: x[1], reverse=True)[:20]


# Usage
async def main():
    scraper = TwitterScraper()
    
    # Scan keywords
    results = await scraper.scan_keywords()
    for keyword, data in results.items():
        velocity = scraper.calculate_velocity(keyword)
        print(f"{keyword}: {data['count']} tweets, velocity: {velocity:.2f}x")
        
    # Find emerging terms
    emerging = await scraper.find_emerging_terms()
    print("\nEmerging terms:")
    for term, freq in emerging[:10]:
        print(f"  {term}: {freq}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Step 3: Narrative AI Synthesizer

### src/analysis/narrative.py
```python
import os
from anthropic import Anthropic
from openai import OpenAI
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import json

class Narrative(BaseModel):
    """Represents a detected narrative."""
    name: str
    confidence: int  # 0-100
    summary: str
    keywords: list[str]
    suggested_tickers: list[str]
    source_platform: str
    first_detected: datetime
    velocity_score: float
    sample_posts: list[str]
    related_tokens: list[dict] = []
    alert_level: str = "LOW"  # LOW, MEDIUM, HIGH, URGENT

class NarrativeSynthesizer:
    """
    Uses AI to synthesize narratives from social media posts.
    """
    
    SYNTHESIS_PROMPT = """You are an expert crypto narrative analyst. Your job is to identify emerging memecoin narratives from social media posts.

A "narrative" is a theme, story, or meme that could inspire a memecoin launch. Examples:
- "Minecraft Grandma" - 81-year-old streams Minecraft for grandson's cancer treatment
- "AI Agents" - Autonomous AI bots trading and creating tokens
- "Slerf" - Dev accidentally burned LP, community embraced the chaos

Analyze these posts and identify any emerging narratives:

<posts>
{posts}
</posts>

Respond in JSON format:
{{
    "narratives": [
        {{
            "name": "Short catchy name",
            "confidence": 0-100,
            "summary": "2-3 sentence explanation of the narrative",
            "keywords": ["key", "words", "to", "track"],
            "suggested_tickers": ["TICKER1", "TICKER2"],
            "why_it_could_pump": "Brief explanation of memetic potential",
            "risk_factors": ["potential", "risks"]
        }}
    ],
    "no_narratives_reason": "If none found, explain why"
}}

Only include narratives with confidence > 40. Focus on NEW, EMERGING narratives, not established ones like DOGE or PEPE."""

    def __init__(self):
        self.anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
    async def synthesize(self, posts: list[str]) -> list[Narrative]:
        """
        Analyze posts and extract narratives.
        """
        if not posts:
            return []
            
        # Limit to avoid token limits
        posts_text = "\n---\n".join(posts[:50])
        
        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": self.SYNTHESIS_PROMPT.format(posts=posts_text)
                }]
            )
            
            # Parse JSON response
            content = response.content[0].text
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            data = json.loads(content)
            
            narratives = []
            for n in data.get("narratives", []):
                narrative = Narrative(
                    name=n["name"],
                    confidence=n["confidence"],
                    summary=n["summary"],
                    keywords=n["keywords"],
                    suggested_tickers=n["suggested_tickers"],
                    source_platform="twitter",  # Adjust based on source
                    first_detected=datetime.utcnow(),
                    velocity_score=1.0,  # Calculate separately
                    sample_posts=posts[:5],
                    alert_level=self._calculate_alert_level(n["confidence"])
                )
                narratives.append(narrative)
                
            return narratives
            
        except Exception as e:
            print(f"Synthesis error: {e}")
            return []
    
    def _calculate_alert_level(self, confidence: int) -> str:
        if confidence >= 80:
            return "HIGH"
        elif confidence >= 60:
            return "MEDIUM"
        else:
            return "LOW"
    
    async def generate_narrative_brief(self, narrative: Narrative) -> str:
        """
        Generate a detailed brief for a narrative (for alerts).
        """
        prompt = f"""Write a brief 2-paragraph narrative alert for crypto traders:

Narrative: {narrative.name}
Summary: {narrative.summary}
Confidence: {narrative.confidence}%
Keywords: {', '.join(narrative.keywords)}
Suggested Tickers: {', '.join(narrative.suggested_tickers)}

Sample posts:
{chr(10).join(narrative.sample_posts[:3])}

Write in a punchy, CT (Crypto Twitter) style. Include:
1. What the narrative is and why it matters
2. What to watch for (tokens, signals, risks)

Keep it under 150 words."""

        response = self.anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text


# Usage example
async def main():
    synthesizer = NarrativeSynthesizer()
    
    # Example posts (in production, these come from Twitter scraper)
    sample_posts = [
        "This 81 year old grandma is streaming Minecraft to pay for her grandson's cancer treatment 😭 CT needs to help her",
        "omg the minecraft grandma is going viral on tiktok, someone make a coin",
        "GRANDMA coin when? This narrative is going to pump so hard",
        "Watching grandma play minecraft while I ape memecoins, what a timeline",
        "The minecraft grandma story is actually heartwarming, rare W for humanity"
    ]
    
    narratives = await synthesizer.synthesize(sample_posts)
    
    for n in narratives:
        print(f"\n{'='*50}")
        print(f"Narrative: {n.name}")
        print(f"Confidence: {n.confidence}%")
        print(f"Alert Level: {n.alert_level}")
        print(f"Summary: {n.summary}")
        print(f"Keywords: {n.keywords}")
        print(f"Suggested Tickers: {n.suggested_tickers}")
        
        # Generate brief
        brief = await synthesizer.generate_narrative_brief(n)
        print(f"\nAlert Brief:\n{brief}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

---

## Step 4: Pump.fun Token Watcher

### src/scrapers/pumpfun.py
```python
import os
import httpx
import asyncio
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class PumpFunToken(BaseModel):
    """Represents a pump.fun token."""
    address: str
    name: str
    symbol: str
    description: Optional[str]
    image_url: Optional[str]
    market_cap: float
    created_at: datetime
    bonding_progress: float  # 0-100%
    creator: str
    
class PumpFunWatcher:
    """
    Watches pump.fun for new token launches and matches them to narratives.
    """
    
    # Moralis API endpoints
    MORALIS_BASE = "https://solana-gateway.moralis.io"
    
    def __init__(self):
        self.moralis_key = os.getenv("MORALIS_API_KEY")
        self.client = httpx.AsyncClient(
            headers={"X-API-Key": self.moralis_key}
        )
        self.known_tokens = set()
        
    async def get_new_tokens(self) -> list[PumpFunToken]:
        """
        Fetch newly created pump.fun tokens.
        Uses Moralis Pump.fun API.
        """
        try:
            response = await self.client.get(
                f"{self.MORALIS_BASE}/token/mainnet/pump-fun/new",
                params={"limit": 50}
            )
            response.raise_for_status()
            data = response.json()
            
            tokens = []
            for t in data.get("result", []):
                if t["tokenAddress"] not in self.known_tokens:
                    self.known_tokens.add(t["tokenAddress"])
                    tokens.append(PumpFunToken(
                        address=t["tokenAddress"],
                        name=t.get("name", "Unknown"),
                        symbol=t.get("symbol", "???"),
                        description=t.get("description"),
                        image_url=t.get("logo"),
                        market_cap=float(t.get("marketCapUsd", 0)),
                        created_at=datetime.fromisoformat(t["createdAt"].replace("Z", "+00:00")),
                        bonding_progress=float(t.get("bondingProgress", 0)),
                        creator=t.get("creator", "")
                    ))
            return tokens
            
        except Exception as e:
            print(f"Moralis API error: {e}")
            return []
    
    async def get_token_details(self, address: str) -> Optional[dict]:
        """
        Get detailed info about a specific token.
        """
        try:
            response = await self.client.get(
                f"{self.MORALIS_BASE}/token/mainnet/{address}/metadata"
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Token details error: {e}")
            return None
    
    def match_to_narrative(self, token: PumpFunToken, narratives: list) -> Optional[dict]:
        """
        Check if a token matches any detected narratives.
        Returns match score and narrative if found.
        """
        best_match = None
        best_score = 0
        
        token_text = f"{token.name} {token.symbol} {token.description or ''}".lower()
        
        for narrative in narratives:
            score = 0
            
            # Check keyword matches
            for keyword in narrative.keywords:
                if keyword.lower() in token_text:
                    score += 20
                    
            # Check ticker matches
            for ticker in narrative.suggested_tickers:
                if ticker.lower() == token.symbol.lower():
                    score += 40
                elif ticker.lower() in token.symbol.lower():
                    score += 20
                    
            # Check name similarity
            if narrative.name.lower() in token.name.lower():
                score += 30
                
            if score > best_score:
                best_score = score
                best_match = {
                    "narrative": narrative,
                    "score": score,
                    "token": token
                }
                
        # Only return if score is meaningful
        if best_score >= 40:
            return best_match
        return None


# Background watcher loop
async def watch_loop(watcher: PumpFunWatcher, narratives: list, callback):
    """
    Continuously watch for new tokens and match to narratives.
    """
    while True:
        new_tokens = await watcher.get_new_tokens()
        
        for token in new_tokens:
            match = watcher.match_to_narrative(token, narratives)
            if match:
                await callback(match)
                
        await asyncio.sleep(10)  # Check every 10 seconds


# Usage
async def main():
    watcher = PumpFunWatcher()
    
    # Simulated narratives (in production, from NarrativeSynthesizer)
    from analysis.narrative import Narrative
    test_narratives = [
        Narrative(
            name="Minecraft Grandma",
            confidence=85,
            summary="Grandma streaming Minecraft for charity",
            keywords=["grandma", "minecraft", "granny", "stream"],
            suggested_tickers=["GRANDMA", "GRANNY", "MCGRAN"],
            source_platform="twitter",
            first_detected=datetime.utcnow(),
            velocity_score=3.5,
            sample_posts=[],
            alert_level="HIGH"
        )
    ]
    
    async def on_match(match):
        print(f"\n🚨 NARRATIVE MATCH DETECTED!")
        print(f"Token: {match['token'].name} ({match['token'].symbol})")
        print(f"Narrative: {match['narrative'].name}")
        print(f"Match Score: {match['score']}")
        print(f"Market Cap: ${match['token'].market_cap:,.2f}")
        
    # Just fetch once for demo
    tokens = await watcher.get_new_tokens()
    print(f"Found {len(tokens)} new tokens")
    
    for token in tokens[:5]:
        print(f"  - {token.name} ({token.symbol}) - ${token.market_cap:,.0f}")
        match = watcher.match_to_narrative(token, test_narratives)
        if match:
            await on_match(match)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Step 5: Telegram Alert Bot

### src/alerts/telegram_bot.py
```python
import os
import asyncio
from datetime import datetime
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, ContextTypes
from telegram.constants import ParseMode

class NarrativeAlertBot:
    """
    Telegram bot for narrative alerts.
    """
    
    def __init__(self):
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.app = Application.builder().token(self.token).build()
        self.subscribers = set()  # In production, use database
        
        # Register handlers
        self.app.add_handler(CommandHandler("start", self.cmd_start))
        self.app.add_handler(CommandHandler("narratives", self.cmd_narratives))
        self.app.add_handler(CommandHandler("subscribe", self.cmd_subscribe))
        self.app.add_handler(CommandHandler("unsubscribe", self.cmd_unsubscribe))
        self.app.add_handler(CommandHandler("help", self.cmd_help))
        
    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        welcome = """
🔮 *Welcome to NarrativeAlpha!*

I track emerging memecoin narratives on pump.fun before they pump.

*Commands:*
/narratives - View top emerging narratives
/subscribe - Get real-time alerts
/unsubscribe - Stop alerts
/help - More info

_Find the alpha before CT does._
        """
        await update.message.reply_text(welcome, parse_mode=ParseMode.MARKDOWN)
        
    async def cmd_narratives(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show current top narratives."""
        # In production, fetch from database
        narratives_text = """
📊 *Top Emerging Narratives*

1️⃣ *Minecraft Grandma* 🎮
   Confidence: 87% | Velocity: 4.2x
   Status: 🟢 Token launched ($GRANDMA)
   
2️⃣ *AI Agent Wars* 🤖
   Confidence: 72% | Velocity: 2.8x
   Status: 🟡 Multiple tokens
   
3️⃣ *Slerf Pt. 2* 😅
   Confidence: 58% | Velocity: 1.9x
   Status: 🔴 No token yet

_Updated: {time}_
        """.format(time=datetime.utcnow().strftime("%H:%M UTC"))
        
        await update.message.reply_text(narratives_text, parse_mode=ParseMode.MARKDOWN)
        
    async def cmd_subscribe(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Subscribe to alerts."""
        chat_id = update.effective_chat.id
        self.subscribers.add(chat_id)
        await update.message.reply_text(
            "✅ Subscribed to narrative alerts!\n\nYou'll receive:\n"
            "• 🟢 New narrative detections\n"
            "• 🟡 Token matches\n" 
            "• 🔴 Velocity spikes\n\n"
            "Use /unsubscribe to stop."
        )
        
    async def cmd_unsubscribe(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Unsubscribe from alerts."""
        chat_id = update.effective_chat.id
        self.subscribers.discard(chat_id)
        await update.message.reply_text("❌ Unsubscribed from alerts.")
        
    async def cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show help."""
        help_text = """
🔮 *NarrativeAlpha Help*

*What I do:*
I scan Twitter, Reddit, and TikTok for emerging memecoin narratives, then alert you when:
1. A new narrative is detected
2. A token launches matching a narrative
3. A narrative's velocity spikes (going viral)

*Alert Levels:*
🟢 LOW - New narrative, low confidence
🟡 MEDIUM - Narrative gaining traction
🔴 HIGH - Narrative spiking, act fast
🟣 URGENT - Smart money moving

*Tips:*
• Not financial advice - DYOR
• Narratives can die as fast as they emerge
• Early != guaranteed profit

*More info:* narrativealpha.xyz
        """
        await update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)
        
    async def send_alert(self, narrative: dict, alert_type: str = "NEW"):
        """
        Send alert to all subscribers.
        """
        emoji_map = {
            "NEW": "🟢",
            "MATCH": "🟡", 
            "SPIKE": "🔴",
            "SMART_MONEY": "🟣"
        }
        
        message = f"""
{emoji_map.get(alert_type, "📢")} *NARRATIVE ALERT*

*{narrative['name']}*
Confidence: {narrative['confidence']}%
Velocity: {narrative.get('velocity', 1.0):.1f}x

{narrative['summary']}

Keywords: {', '.join(narrative.get('keywords', [])[:5])}
Suggested: {', '.join(narrative.get('tickers', [])[:3])}

_Detected: {datetime.utcnow().strftime("%H:%M UTC")}_
        """
        
        bot = Bot(token=self.token)
        for chat_id in self.subscribers:
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode=ParseMode.MARKDOWN
                )
            except Exception as e:
                print(f"Failed to send to {chat_id}: {e}")
                
    async def send_token_match(self, token: dict, narrative: dict, score: int):
        """
        Send token match alert.
        """
        message = f"""
🟡 *TOKEN MATCH DETECTED*

Token: *{token['name']}* (${token['symbol']})
Address: `{token['address'][:20]}...`
Market Cap: ${token.get('market_cap', 0):,.0f}

Matched Narrative: *{narrative['name']}*
Match Score: {score}/100

⚠️ DYOR - Not financial advice
        """
        
        bot = Bot(token=self.token)
        for chat_id in self.subscribers:
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode=ParseMode.MARKDOWN
                )
            except Exception as e:
                print(f"Failed to send to {chat_id}: {e}")
                
    def run(self):
        """Start the bot."""
        print("🤖 Starting NarrativeAlpha bot...")
        self.app.run_polling()


# Usage
if __name__ == "__main__":
    bot = NarrativeAlertBot()
    bot.run()
```

---

## Step 6: Main Orchestrator

### src/main.py
```python
import asyncio
from datetime import datetime
from loguru import logger

from scrapers.twitter import TwitterScraper
from scrapers.pumpfun import PumpFunWatcher
from analysis.narrative import NarrativeSynthesizer, Narrative
from alerts.telegram_bot import NarrativeAlertBot

class NarrativeAlpha:
    """
    Main orchestrator that ties everything together.
    """
    
    def __init__(self):
        self.twitter = TwitterScraper()
        self.pumpfun = PumpFunWatcher()
        self.synthesizer = NarrativeSynthesizer()
        self.telegram = NarrativeAlertBot()
        
        self.active_narratives: list[Narrative] = []
        self.alerted_narratives: set[str] = set()
        
    async def scan_cycle(self):
        """
        One full scan cycle:
        1. Scrape Twitter
        2. Detect narratives
        3. Watch pump.fun
        4. Send alerts
        """
        logger.info("Starting scan cycle...")
        
        # 1. Scan Twitter keywords
        keyword_results = await self.twitter.scan_keywords()
        
        # 2. Find emerging terms
        emerging = await self.twitter.find_emerging_terms()
        logger.info(f"Found {len(emerging)} emerging terms")
        
        # 3. Collect recent posts for analysis
        posts = []
        for term, _ in emerging[:10]:
            tweets = await self.twitter.search_recent(term, max_results=20)
            posts.extend([t.text for t in tweets])
            
        # 4. Synthesize narratives
        if posts:
            new_narratives = await self.synthesizer.synthesize(posts)
            
            for narrative in new_narratives:
                # Calculate velocity
                if narrative.keywords:
                    velocities = [
                        self.twitter.calculate_velocity(kw) 
                        for kw in narrative.keywords
                    ]
                    narrative.velocity_score = max(velocities) if velocities else 1.0
                    
                # Update alert level based on velocity
                if narrative.velocity_score > 5:
                    narrative.alert_level = "URGENT"
                elif narrative.velocity_score > 3:
                    narrative.alert_level = "HIGH"
                    
                # Check if new
                if narrative.name not in self.alerted_narratives:
                    self.active_narratives.append(narrative)
                    self.alerted_narratives.add(narrative.name)
                    
                    # Send alert
                    if narrative.confidence >= 50:
                        await self.telegram.send_alert({
                            "name": narrative.name,
                            "confidence": narrative.confidence,
                            "velocity": narrative.velocity_score,
                            "summary": narrative.summary,
                            "keywords": narrative.keywords,
                            "tickers": narrative.suggested_tickers
                        }, alert_type="NEW")
                        logger.info(f"Alerted: {narrative.name}")
                        
        # 5. Watch pump.fun for matches
        new_tokens = await self.pumpfun.get_new_tokens()
        
        for token in new_tokens:
            match = self.pumpfun.match_to_narrative(token, self.active_narratives)
            if match and match["score"] >= 50:
                await self.telegram.send_token_match(
                    {
                        "name": token.name,
                        "symbol": token.symbol,
                        "address": token.address,
                        "market_cap": token.market_cap
                    },
                    {"name": match["narrative"].name},
                    match["score"]
                )
                logger.info(f"Token match: {token.symbol} -> {match['narrative'].name}")
                
        logger.info(f"Scan complete. Active narratives: {len(self.active_narratives)}")
        
    async def run(self):
        """
        Main loop.
        """
        logger.info("🔮 NarrativeAlpha starting...")
        
        # Start Telegram bot in background
        # Note: In production, run bot separately
        
        while True:
            try:
                await self.scan_cycle()
            except Exception as e:
                logger.error(f"Scan cycle error: {e}")
                
            # Wait before next cycle
            await asyncio.sleep(60)  # Every minute


if __name__ == "__main__":
    app = NarrativeAlpha()
    asyncio.run(app.run())
```

---

## Quick Test

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Test Twitter scraper
python -m src.scrapers.twitter

# Test narrative synthesis
python -m src.analysis.narrative

# Test pump.fun watcher
python -m src.scrapers.pumpfun

# Run Telegram bot
python -m src.alerts.telegram_bot

# Run full system
python -m src.main
```

---

## Next Steps

1. **Get API keys**: Twitter, Moralis, OpenAI/Anthropic, Telegram
2. **Set up database**: PostgreSQL for persistence
3. **Add Redis**: For real-time velocity tracking
4. **Build web dashboard**: Next.js frontend
5. **Deploy**: Railway or similar

---

## Resources

- [Twitter API v2 Docs](https://developer.twitter.com/en/docs/twitter-api)
- [Moralis Pump.fun API](https://docs.moralis.com/web3-data-api/solana/tutorials/introduction-to-pump-fun-api-support-in-moralis)
- [python-telegram-bot](https://python-telegram-bot.org/)
- [Anthropic Claude API](https://docs.anthropic.com/)

Good luck in the trenches! 🚀
