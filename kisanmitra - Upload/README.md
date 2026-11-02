# 🌾 KisanMitra – AI farm advisor for rural India

**Hackathon theme:** AgriTech & Rural Innovation (with an AI Agents twist)

**Problem:** Small farmers decide when to sell, irrigate, spray or harvest using guesswork and middlemen. Information is scattered, mostly in English, and never tied to *their* fields.

**Solution:** One app where the farmer tracks crops and costs, watches mandi prices, sets price alerts, and chats (in any language) with an **autonomous AI agent** that looks up their real crops, prices and weather, and takes actions for them (create alerts, log activities).

## Tech stack (MERN)
- **MongoDB** + Mongoose – users, crops, activity logs, prices, alerts, chat history
- **Express / Node** – REST API, JWT auth, helmet, rate limiting
- **React (Vite)** – dashboard, crop tracker, AI chat, price charts (Recharts)
- **AI agent** – Claude tool-use loop (`server/services/agent.js`) with 5 tools; offline rule-based fallback so the demo works without an API key

## Quick start
```bash
# 1. Database (or use MongoDB Atlas and set MONGO_URI)
docker run -d -p 27017:27017 mongo:7

# 2. Backend
cd server
cp .env.example .env        # paste ONE key: GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY (optional)
npm install
npm run seed                # demo data
npm run dev

# 3. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```
Demo login: `demo@kisanmitra.in` / `demo1234`

Or run everything with `docker compose up` (set `ANTHROPIC_API_KEY` in your shell for live AI).

## API overview
| Route | Purpose |
|---|---|
| `POST /api/auth/register, /login` · `GET/PUT /api/auth/me` | JWT auth + profile |
| `GET/POST/PUT/DELETE /api/crops` · `POST /api/crops/:id/logs` | Crop tracker + cost logs |
| `GET /api/prices` · `GET /api/prices/:commodity` | Prices + 7-day trend |
| `GET/POST/DELETE /api/prices/alerts…` | Price alerts |
| `POST /api/advisory/:id/message` | Chat with the agent (`new` starts a chat) |
| `GET /api/dashboard` | Totals, projected revenue/profit, cost breakdown |

## Agent tools
`get_my_crops` · `get_market_prices` · `get_weather` (Open-Meteo, no key) · `create_price_alert` · `log_crop_activity`

## 3-minute demo script
1. **Problem (20s):** farmers lose money on timing and information gaps.
2. **Login** with demo account → **Dashboard**: projected revenue/profit from real crops × live prices.
3. **Prices tab:** wheat trending up; show the alert that already triggered.
4. **AI Advisor:** ask "What is the wheat price today? Should I sell?" → show the tool badges (agent looked up prices itself).
5. Ask "Set an alert when onion goes above 2000" → open Prices tab, alert exists. *The agent acted, not just answered.*
6. Ask in Hindi: "मेरे टमाटर के पत्ते पीले हो रहे हैं".
7. **Impact (30s):** 100M+ farming households in India; target cheaper inputs, better sale timing, fewer crop losses.

## Ideas to extend (if you have time before judging)
- Image upload for crop disease detection (vision model)
- SMS / WhatsApp alerts via Twilio
- Live Agmarknet / data.gov.in mandi price import (replace seed data)
- Offline-first PWA + voice input for low-literacy users
- Cooperative selling: pool produce from nearby farmers

## Notes
- Prices in the seed script are **sample data**; say so in your pitch, and mention the Agmarknet integration as the next step.
- The advisor gives general guidance; for serious pest/disease outbreaks it points farmers to their local KVK.
