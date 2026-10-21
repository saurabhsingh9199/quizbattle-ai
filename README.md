# ⚡ QuizBattle — Real-Time Multiplayer Quiz Game

A premium, production-grade multiplayer quiz battle platform built with the MERN stack + Socket.IO.

---

## 🎨 Design System

| Feature | Implementation |
|---|---|
| Theme | Dark neon with glassmorphism |
| Colors | Blue `#00d4ff` · Purple `#9b59ff` · Pink `#ff3cac` · Green `#00ff88` |
| Fonts | Syne (display) · DM Sans (body) |
| Animations | Framer Motion throughout |
| Effects | Glassmorphism cards · Animated orb backgrounds · Circular timer · Confetti |

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Framer Motion |
| Styling | Pure CSS (variables + glassmorphism) |
| Real-time | Socket.IO client/server |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + guest tokens) |
| AI | Google Gemini API (`@google/genai`) |
| Sound | Web Audio API |

---

## 📂 Project Structure

```
quiz-battle/
├── server/
│   ├── index.js              # Express + Socket.IO entry point
│   ├── socket/
│   │   └── socketHandlers.js # Real-time game engine
│   ├── models/
│   │   ├── User.js
│   │   ├── Quiz.js
│   │   └── Room.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── quiz.js
│   │   └── room.js
│   ├── services/
│   │   └── aiQuizService.js  # Gemini quiz generation
│   └── middleware/
│       ├── auth.js
│       └── aiRateLimit.js
└── client/
    └── src/
        ├── App.js
        ├── index.css           # Global styles + design tokens
        ├── context/
        │   ├── AuthContext.js
        │   ├── SocketContext.js
        │   └── ThemeContext.js
        ├── pages/
        │   ├── LandingPage.js
        │   ├── AuthPage.js
        │   ├── DashboardPage.js
        │   ├── AIQuizGeneratorPage.js
        │   ├── LobbyPage.js
        │   ├── GamePage.js
        │   └── ResultsPage.js
        ├── components/
        │   └── layout/
        │       ├── Navbar.js
        │       └── AppBackground.js
        ├── styles/
        │   └── AIQuizGenerator.css
        └── utils/
            └── sounds.js
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 2. Server Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 3. Client Setup
```bash
cd client
npm install
npm start
```

### 4. Open in Browser
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 🎮 How to Play

1. **Register / Login** — or jump in as a guest
2. **Create a Room** from Dashboard — get a 6-char room code
3. **Share the code** with friends
4. **Players join** via lobby — watch them appear in real-time
5. **Host starts** the game — 3-second countdown
6. **Answer questions** — faster correct answers = more points
7. **Leaderboard updates** live between questions
8. **Results page** shows final rankings with confetti 🎊

---

## 🤖 AI Quiz Generator

Create custom quizzes on any topic using **Google Gemini**, then play them instantly with the existing multiplayer flow.

1. **Dashboard** → click **Generate with AI**
2. **Configure** — topic, category, difficulty (Easy/Medium/Hard/Expert), question count (5/10/15/20), explanations on/off
3. **Generate** — Gemini returns a preview with questions, options, correct answers, and explanations
4. **Review** — Edit, Save, Regenerate, or **Play Now** (creates a room and uses the normal lobby/game flow)

### API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/quiz/generate` | JWT | Generate quiz via Gemini (preview only) |
| `POST` | `/api/quiz/save-generated` | JWT | Save AI quiz to MongoDB |
| `PUT` | `/api/quiz/:id/update-generated` | JWT | Update a saved AI quiz |

The Gemini API key is read from the server `.env` only — never exposed to the client.

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `join_room` | Client → Server | Join a game lobby |
| `room_joined` | Server → Client | Room state on join |
| `player_joined` | Server → All | New player notification |
| `start_game` | Client → Server | Host starts the game |
| `game_starting` | Server → All | Countdown begins |
| `question_start` | Server → All | New question data |
| `submit_answer` | Client → Server | Player's answer |
| `answer_confirmed` | Server → Client | Result + points |
| `answer_update` | Server → All | Live answer count |
| `question_end` | Server → All | Reveal + mini leaderboard |
| `game_over` | Server → All | Final results |
| `send_chat` | Client → Server | Lobby chat message |
| `chat_message` | Server → All | Broadcast chat |

---

## 🎯 Pages

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Hero + join code input |
| Auth | `/auth` | Login / Register / Guest |
| Dashboard | `/dashboard` | Stats + create/join room |
| AI Quiz Generator | `/ai-quiz` | AI-powered quiz creation |
| Lobby | `/lobby/:code` | Real-time waiting room + chat |
| Game | `/game/:code` | Live quiz battle |
| Results | `/results/:code` | Final leaderboard + confetti |

---

## 🌟 Premium Features

- ⚡ **Real-time sync** — Socket.IO for instant updates
- 🎨 **Glassmorphism UI** — frosted glass cards with backdrop blur  
- 🌊 **Animated backgrounds** — floating neon orbs
- ⏱️ **Circular countdown timer** — SVG-based with color transitions
- 🎊 **Canvas confetti** — custom particle system on win
- 🔊 **Web Audio sounds** — correct/wrong/tick/win sounds
- 🌙 **Dark/Light toggle** — CSS variable-based theming
- 💬 **Lobby chat** — real-time messaging before game starts
- 👤 **Guest mode** — play without an account (24h JWT)
- 📱 **Fully responsive** — mobile + desktop optimized
- 🏆 **Live leaderboard** — updates between every question
- 🤖 **AI Quiz Generator** — create custom MCQ quizzes with Google Gemini, edit, save, and play instantly

---

## 🔧 Environment Variables

### Server `.env`
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/quizbattle
JWT_SECRET=your_super_secret_key_change_me
CLIENT_URL=http://localhost:3000
NODE_ENV=development

# AI Quiz Generator (Gemini — required for /ai-quiz)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite   # optional
AI_RATE_LIMIT_MAX=10                 # optional — max generations per user per hour
```

### Client `.env` (optional)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 📦 Deployment

### Backend (Railway / Render)
```bash
cd server && npm install && npm start
```

### Frontend (Vercel / Netlify)
```bash
cd client && npm run build
# Deploy the /build folder
```

Set `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` to your production server URL.

---

*Built with ❤️ using React + Socket.IO + MongoDB*

## Performance / Rendering Improvements

- Quiz game answer options are memoized so the 1-second countdown does not repaint the whole answer UI.
- Timer rendering is isolated from the question/answer area.
- React route-level lazy loading reduces the initial JavaScript bundle and speeds first page load.
- React StrictMode double-mounting was removed from the client entry because the Socket.IO app creates real-time connections during development.
- Local development disables source-map generation and the extra CRA ESLint pass for faster startup.
- `npm run start:fast` serves the existing production build with a tiny Node static server when a `client/build` folder is present.

### Recommended commands

Development with hot reload:

```bash
cd client
npm install
npm start
```

Fast production-style local run after building:

```bash
cd client
npm install
npm run build
npm run start:fast
```
