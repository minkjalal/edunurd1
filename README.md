# 🎓 EduNerd - AI Study Suite & Exam Prep Platform

Runs the full EduNerd app on your own computer at **http://localhost:3000**, including
accounts, saved progress, the community feed with comments & likes, rewards & leaderboard, and the AI tutor / AI-generated questions.

---

## 🚀 Quick Setup

1. **Install Node.js 18 or newer** (https://nodejs.org).
2. In this folder run:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` (or edit the existing `.env`):
   - Set `JWT_SECRET` (any long random text)
   - (Optional) Set `GEMINI_API_KEY` (from https://aistudio.google.com/apikey).
     *Note: The app comes with a built-in offline smart tutor engine, so it works immediately even before adding an API key!*
4. Run:
   ```bash
   npm start
   ```
5. Open **http://localhost:3000** in your browser.

---

## 🌟 What It Provides

- **`POST /api/register` & `POST /api/login`**: Email + password accounts (bcrypt hashed, 30-day token).
- **`POST /api/db`**: Generic document store for saved user progress (`data/users/<uid>`), shared community posts (`posts`), threaded comments (`posts/<id>/comments`), likes (`posts/<id>/likes`), and the live leaderboard (`board`).
- **`POST /api/ai`**: Gemini proxy (text + photos); your API key stays safe on the server with per-user rate limiting and instant offline fallback.
- **`public/index.html`**: The full responsive single-page EduNerd app with Light/Dark mode, 3D interactive Flashcards, Pomodoro timer with hydration/break reminders, interactive physics & science simulations, and 10-year PYQ explorer.
- **`public/shim.js`**: Connects the frontend seamlessly to backend routes.

---

## ⚙️ Environment Variables (`.env`)

```env
PORT=3000
JWT_SECRET=your_long_random_secret_here

# Optional: Google Gemini API (default model: gemini-1.5-flash)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# Optional: Google OAuth Client ID for 1-click Google Sign-in
GOOGLE_CLIENT_ID=
```

---

## 🔒 Google Sign-in (Optional)
1. Open https://console.cloud.google.com/apis/credentials and create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins** add `http://localhost:3000` (and your production domain when deploying).
3. Copy the client ID into `.env` as `GOOGLE_CLIENT_ID=...` and restart the server.
4. The *"Continue with Google"* button will activate automatically.
