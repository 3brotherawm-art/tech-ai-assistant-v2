# Tech AI Assistant by Asad Tech

Apna personal AI assistant — kuch bhi poocho: sawal, seekhna, likhna,
business ideas aur roz ke kaam. Roman Urdu aur English mein jawab.
Users login kar ke apni chat history save karte hain; owner ke liye
alag admin panel hai.

## Stack (MERN)

- `client/` — React + Vite, plain CSS (koi UI library nahi)
- `server/` — Node.js + Express + Mongoose (MongoDB)
- Chat: Google Gemini (`gemini-3-flash-preview`) — key sirf server env var se

## Structure

```
asad-tech-assistant/
  client/                  React frontend
    public/                favicon.svg, favicon.ico, logo.png (flat Heera),
                           robots.txt, sitemap.xml
    src/
      components/          AuthScreen (Durood Pak + Login/Register)
                           ChatApp (sidebar + chat history + chat)
                           AdminPanel (password-gated)
                           Logo (flat vector diamond)
      lib/api.js           backend client (JWT in localStorage)
      App.jsx              routing: /admin ya login/chat
  server/                  Express backend
    index.js               entry: env checks, Mongo connect, static client
    models/                User, Chat, Message
    routes/                auth (register/login), chat, admin
    middleware/auth.js     JWT checks (user + admin)
    .env.example           env vars ki list (koi real value nahi)
```

## Run locally

```bash
# 1) Backend
cd server
cp .env.example .env        # phir .env mein real values bharo (neeche dekho)
npm install
npm start                   # http://localhost:5000

# 2) Frontend (alag terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 ( /api -> :5000 proxy )
```

Production mein `client/dist` build kar ke server khud serve karta hai:

```bash
cd client && npm run build
cd ../server && npm start   # ek hi Node app: frontend + API
```

## Env vars (server/.env) — kabhi code mein mat likho

| Var | Kis liye |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google AI Studio key (chat ke liye) |
| `JWT_SECRET` | Login tokens ka secret (lamba random) |
| `ADMIN_PASSWORD` | `/admin` panel ka password (sirf owner) |
| `FREE_TOKENS_PER_DAY` | Free tokens per user per day (default 30000) |
| `PORT` | Backend port (default 5000) |

Agar koi var missing ho to server phir bhi start hota hai aur plain
words mein batata hai kya missing hai — crash nahi karta. Us var se
jude kaam 503 dete hain ("Server abhi tayyar ho raha hai...").

## Free limits + Upgrade (Muse jaisa free plan)

Har user ko roz ki ek hi free limit milti hai — sirf tokens
(30,000 free tokens/user/day). Koi message-count limit nahi: chhote
messages zyada bhej sakte ho, bas tokens ke andar rehna hai.
Limit khatam ho to server 429 deta hai aur client Upgrade ka button
dikhata hai. Upgrade (paid plan) abhi tayyar nahi — price ka elaan
baad mein hoga, is liye code mein KAHIN bhi koi price nahi likhi.
Upgrade modal sirf WhatsApp rabta deta hai: 03039929254.

### Gemini free key ka quota — verified 2026-11-18

Google ne 2026 mein apne API rate-limits docs se free-tier table hata
di hai — ab woh kehta hai apni limit Google AI Studio mein dekho, aur
limits "guaranteed" nahi hain. Is liye koi ek pakka number nahi hai;
ye woh figures hain jo mile:

| Source | gemini-3-flash-preview, free key |
| --- | --- |
| Google quota page (Gemini API/CLI docs, abhi bhi listed) — unpaid API key, Flash only | 250 requests/day, 10/min |
| Independent measurement, dev.to, 2026-09-02 (fresh account) | 5/min, 20/day (asal mein mila) |
| Google AI docs, Jan 2026 data | ~15/min, ~250,000 tokens/min, ~1,000/day |

### Per-user limit ka hisaab

Ek hi limit: **30,000 free tokens/user/day** (env var
`FREE_TOKENS_PER_DAY`).
- Ek message ka kharcha ≈ 1,500 tokens (history + system prompt + reply).
- 30,000 tokens ≈ **20 messages/user/day** — owner ne 20 sawal rozana
  choose kiye hain.
- 10 users/day × 20 messages ≈ 200 requests/day — Google ki listed free
  figure 250 requests/day ke qareeb hai; zyada users aaye to limit
  neeche karni hogi ya paid key leni hogi.
- Agar asal quota 20/day jaisa nikle (upar wali measurement), to env
  var se limit neeche kar do — ya billing on kar ke paid key lo.

Token count: Gemini ki `usageMetadata.totalTokenCount` jab mile to wohi
use hoti hai; warna estimate (text length ÷ 4). Limit check request
bhejne se PEHLE hota hai: aane wale message + max reply (500 tokens)
ka estimate tokensUsed mein jod kar dekha jata hai — agar 30,000 se
zyada ho to 429 milta hai aur Gemini call hoti hi nahi. "Aaj" ka matlab
Asia/Karachi (PKT) ka din hai.

Env var: `FREE_TOKENS_PER_DAY` (default 30000). Sirf successful replies
count hote hain — fail hone par user ki limit nahi kat-ti. Messages ki
ginti sirf admin stats ke liye save hoti hai — us par kabhi block nahi
hota.

## API (sab `/api` se shuru)

| Route | Kaam |
| --- | --- |
| `GET /api/health` | Server + DB + Gemini tayyar hai ya nahi |
| `POST /api/auth/register` | `{ name, email, password }` → JWT + user |
| `POST /api/auth/login` | `{ email, password }` → JWT + user |
| `POST /api/chat` | JWT zaroori. `{ chatId?, content }` → `{ reply, chatId, usage }`. Limit khatam ho to 429 `free_limit_reached` |
| `GET /api/usage` | Apni aaj ki free usage: tokens used/left/limit |
| `GET /api/chats` | Apni chats ki list (sirf apni — userId enforced) |
| `GET /api/chats/:id` | Apni ek chat + us ke messages |
| `DELETE /api/chats/:id` | Apni chat delete karo |
| `POST /api/admin/login` | `{ password }` → admin JWT |
| `GET /api/admin/stats` | Total users / chats / messages |
| `GET /api/admin/users` | Recent users |
| `GET /api/admin/messages` | Sab users ke recent messages |

Privacy rule: har messages/chats query mein `userId` JWT se aata hai —
ek user kabhi doosre user ki chats nahi dekh sakta. Sirf admin panel
(admin JWT) sab ka data dekh sakta hai.

## Admin panel

`/admin` kholo → admin password daalo (jo `ADMIN_PASSWORD` mein set hai).
Phir totals, recent users aur recent messages dikhte hain.

## Chat rules

- Caps: last 10 messages, 500 chars per message, 4000 total chars;
  temperature 0.7, maxOutputTokens 500.
- Assistant user ki language mein jawab deta hai (Roman Urdu ya English),
  poora aur natural — ek line wale robotic jawab nahi.
- Brand context sirf poochne par: Asad Tools (Muse 1B Rs 250 … 30B Rs 1000),
  AuraBill (1 month Rs 1000 … 12 months Rs 7500), Website Packages
  (Basic Rs 5000, Business Rs 7000, Premium Rs 15000), WhatsApp 03039929254.

## Deploy (kal ke liye)

1. **MongoDB Atlas**: free cluster banao → Database Access user + Network
   Access `0.0.0.0/0` → connection string `MONGODB_URI` mein daalo.
2. **Backend hosting**: Node host chahiye (Render / Railway / Fly.io).
   Vercel static hosting akeli kaafi nahi — Express server chahiye.
   `client/dist` build kar ke server ke saath deploy karo (server khud
   static files serve karta hai), ya frontend alag host karo aur
   `VITE_API_URL` mein backend URL set karo.
3. Env vars host par set karo: `MONGODB_URI`, `GEMINI_API_KEY`,
   `JWT_SECRET`, `ADMIN_PASSWORD` (aur chaaho to `FREE_TOKENS_PER_DAY`).
4. Google Search Console: property add karo + sitemap submit karo
   (`/sitemap.xml`).

## Notes

- Design: flat, professional — solid navy + gold, koi gradient/glow nahi.
- Logo: flat vector Heera (diamond) — `client/public/logo.png`,
  `favicon.svg`, `favicon.ico` sab code se banaye gaye hain.
- Passwords bcrypt se hash hote hain; JWT 30 din (user) / 12 ghante (admin).
