# 🌾 KisanMitra

**An AI farm assistant for small farmers in India.** It checks your crops, mandi prices and weather, then takes action for you: sets price alerts and logs farm work.

---

## About

Small farmers often decide when to sell, irrigate, spray or harvest using guesswork and middlemen. Information is scattered, mostly in English, and never tied to their own fields.

KisanMitra puts it all in one place. A farmer can track crops and costs, watch mandi prices, set price alerts, and chat in Hindi, English or Hinglish with an AI agent that reads their real data and acts on it.

## Features

| Feature | What it does |
|---|---|
| 🤖 AI Advisor | Chat that uses the farmer's own crops, prices and weather |
| 🌱 Crop tracker | Area, soil, sowing date, activity and cost logs |
| 📈 Price alerts | 9 commodities, 7-day trend, alert at your target price |
| 📊 Dashboard | Projected revenue, total spend and profit for the season |
| ⛅ Weather | 5-day forecast (Open-Meteo, no key needed) |
| 🛡️ Safe advice | Label doses only; serious cases are sent to the local KVK |
| 🔌 Always available | An offline advisor answers if no AI key is set or the API fails |
| 👤 Profile | Login, farmer profile and profile photo |

### What makes it different

1. **An agent that acts.** It creates price alerts and logs crop activity, it does not only reply with text.
2. **Your farm, not generic advice.** Every answer starts from the farmer's own data.
3. **Works with any AI provider.** Gemini, ChatGPT or Claude, through the same tool definitions.

## Tech stack (MERN)

- **MongoDB** + Mongoose: users, crops with logs, prices, alerts, chat history
- **Express / Node.js**: REST API, JWT login, bcrypt passwords, helmet, rate limiting
- **React (Vite)**: dashboard, crop tracker, chat, price charts (Recharts)
- **AI agent service**: tool-calling loop (up to 6 steps) with 5 tools, in `server/services/agent.js`

```
React (Vite)  ──►  Express API  ──►  MongoDB
                       │
                       └──►  AI agent  ──►  Gemini / OpenAI / Claude
                                  └──►  Open-Meteo (weather)
```

## Agent tools

`get_my_crops` · `get_market_prices` · `get_weather` · `create_price_alert` · `log_crop_activity`

## Project structure

```
kisanmitra/
├── client/            React app (Vite)
│   └── src/           pages, API helper, auth context
├── server/
│   ├── routes/        auth, crops, prices, advisory, dashboard
│   ├── models/        User, Crop, PriceEntry, Alert, Advisory
│   ├── services/      agent.js (AI loop), tools.js (agent tools)
│   ├── seed.js        demo data
│   └── server.js      app entry
└── docker-compose.yml
```

## Run it locally

You need **Node.js 18+** and **MongoDB** (local, Docker or MongoDB Atlas).

```bash
# 1. Database (skip if you already have MongoDB or Atlas)
docker run -d -p 27017:27017 mongo:7

# 2. Backend
cd server
cp .env.example .env      # on Windows: copy .env.example .env
npm install
npm run seed              # optional demo data
npm run dev               # http://localhost:5000

# 3. Frontend (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

Demo login after seeding: `demo@kisanmitra.in` / `demo1234`

Or run everything with Docker: `docker compose up`

### Environment variables

Copy `server/.env.example` to `server/.env` and fill it in. **Never commit `.env`.**

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random text for login tokens |
| `CLIENT_ORIGIN` | Frontend URL allowed by CORS |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Fill **one**. Free Gemini key: https://aistudio.google.com/apikey |
| `AI_PROVIDER` | Optional: `gemini`, `openai` or `anthropic` |
| `GEMINI_MODEL` | e.g. `gemini-flash-lite-latest` |

With no key, the built-in offline advisor answers, so the app still works.

When the frontend and API are hosted separately, set `VITE_API_URL` in the client (for example `https://your-api.onrender.com/api`).

## API overview

| Route | Purpose |
|---|---|
| `POST /api/auth/register`, `/login` · `GET/PUT /api/auth/me` | JWT auth and profile |
| `GET/POST/PUT/DELETE /api/crops` · `POST /api/crops/:id/logs` | Crop tracker and cost logs |
| `GET /api/prices` · `GET /api/prices/:commodity` | Prices and 7-day trend |
| `GET/POST/DELETE /api/prices/alerts…` | Price alerts |
| `POST /api/advisory/:id/message` | Chat with the agent (`new` starts a chat) |
| `GET /api/dashboard` | Totals, projected revenue and profit, cost breakdown |
| `GET /api/health` | Server status and active AI provider |

## Roadmap

- Live Agmarknet mandi prices
- Hindi voice input and an installable phone app
- Crop disease check from a photo
- SMS and WhatsApp alerts, more languages
- Village cooperatives that sell produce together

## Notes

- Prices in the seed script are **sample data**. Live Agmarknet data is planned.
- The advisor gives general guidance. For serious pest or disease outbreaks it points farmers to the local KVK.
