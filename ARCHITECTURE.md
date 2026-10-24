# EduNerd architecture overview

This document describes the running EduNerd system as it exists in this repository. The diagrams use Mermaid, so GitHub renders them directly in the repository view. The application is a browser SPA backed by three cooperating local services:

| Service | Responsibility | Local endpoint |
| --- | --- | --- |
| React SPA + Express host | UI, authentication, flat document storage, static assets, offline AI fallback | `http://localhost:3210` (or `PORT`, default `3000`) |
| FastAPI epistemic engine | Groq/Gemini tutor, consistency audit, study plans, flashcards | `http://localhost:8000` |
| Community sidecar | Channel REST endpoints, WebSocket chat, presence, and chat persistence | `http://localhost:3001` |

The browser keeps learner progress, preferences, and the local community history in `localStorage`. The Express server persists its document store in `data.json`; the sidecar uses `chat-data.json` locally and can be moved to the additive SQL schema in `sidecar/schema.sql` for a shared deployment.

## 1. System and deployment topology

```mermaid
flowchart LR
    learner["Learner\nBrowser"]
    spa["React SPA\nsrc/ -> public/bundle.js"]
    host["Express host\nserver.js\nstatic files + auth + /api/db + /api/ai"]
    engine["FastAPI epistemic engine\nbackend/server.py\n:8000"]
    chat["Community sidecar\nsidecar/chat-server.js\n:3001 REST + WebSocket"]
    groq[("Groq API")]
    gemini[("Optional Gemini API")]
    appStore[("data.json\nExpress document store")]
    browserStore[("Browser localStorage\nprofile, progress, cards, settings")]
    chatStore[("chat-data.json\nor sidecar SQL schema")]

    learner --> spa
    spa --> browserStore
    spa --> host
    spa --> engine
    spa --> chat
    host --> appStore
    host -. optional remote AI .-> gemini
    engine --> groq
    engine -. compatibility fallback .-> gemini
    chat --> chatStore
```

**Boundary rule:** the browser never receives a provider secret. Groq and Gemini calls are made by the server processes, while the browser receives validated JSON responses or a deterministic offline response.

## 2. Frontend architecture

```mermaid
flowchart TD
    entry["src/index.jsx\nReact root"] --> app["src/App.jsx\nhash routing + shared shell"]
    app --> context["AppContext\nshared session and learner state"]
    context --> storage["localStorage\nprofile, progress, cards, theme, plans"]
    app --> chrome["Header + NavigationDrawer\nBrandLogo + TutorLogo"]
    app --> views["Route views"]

    views --> dashboard["DashboardView\nplan form, notes, goal meter"]
    views --> tutor["AITutorView\nquestion, answer, audit, export"]
    views --> study["StudyView\ntutor + flashcards + timer tabs"]
    views --> cards["FlashcardsView\ndeck and generated cards"]
    views --> timer["StudyTimerView / TimerView\nPomodoro and ambient audio"]
    views --> community["CommunityView\ncohort channels and moderation"]
    views --> resources["Videos / PYQ / Resources\ninternal learning destinations"]
    views --> rewards["RewardsView\nbadges, XP, streaks"]

    dashboard -->|POST /api/study-plan| engine["FastAPI :8000"]
    tutor -->|POST /api/tutor| engine
    cards -->|POST /api/flashcards/generate| engine
    community --> moderation["communityModeration.js\nfilter, sanitize, cohort policy"]
    community -->|REST + WebSocket| chat["Sidecar :3001"]
    timer -->|recordStudyMinutes| context
    cards -->|pushFlashcards| context
    tutor -->|XP + flashcard export| context
```

`AppContext` is the frontend state boundary. Views dispatch actions such as `recordStudyMinutes`, `pushFlashcards`, `awardXP`, and `resetTodayStudyProgress`; they do not maintain competing copies of progress. This keeps the dashboard meter, timer, YouTube watch-time tracking, streaks, and rewards derived from the same state.

## 3. Backend architecture

```mermaid
flowchart TB
    request["Browser request"] --> express["server.js\nExpress API and static host"]
    request --> fastapi["backend/server.py\nFastAPI schemas and provider orchestration"]
    request --> sidecar["sidecar/chat-server.js\nHTTP + WebSocket gateway"]

    express --> auth["JWT auth\nregister, login, Google exchange"]
    express --> docs["Document store\n/api/db -> data.json"]
    express --> offline["offlineTutor()\nlocal deterministic fallback"]
    fastapi --> verify["/api/tutor and /api/verify\ndraft -> audit -> normalized response"]
    fastapi --> plans["/api/study-plan\nGroq -> Gemini -> deterministic plan"]
    fastapi --> generated["/api/flashcards/generate\nvalidated recall cards"]
    verify --> groq[("Groq\nGPT OSS models")]
    plans --> groq
    generated --> groq
    verify --> helpers["agents.py / rag_engine.py / tutor_engine.py"]
    sidecar --> presence["presence + typing\nheartbeat and channel rooms"]
    sidecar --> messages["message history\nchannel REST + broadcast"]
    sidecar --> chatdb[("chat-data.json\nor schema.sql tables")]
```

### Provider fallback order

1. **Tutor:** Groq draft, Groq second-pass audit, then a useful local `Questioned` answer if the audit is temporarily unavailable.
2. **Study plan:** Groq, then optional Gemini, then deterministic cohort/class/goal plan.
3. **Legacy `/api/ai`:** Gemini when configured, otherwise `offlineTutor()`.
4. **Community:** local React moderation always runs before a message is rendered; the sidecar remains an independent transport and persistence boundary.

## 4. Domain entity diagram

The entity diagram separates the learner domain from community chat. It is a conceptual model of the current JSON/localStorage records and the optional SQL sidecar tables, not a claim that the browser has a relational database today.

```mermaid
erDiagram
    USER_PROFILE ||--|| LEARNER_PROGRESS : owns
    USER_PROFILE ||--o{ FLASHCARD : saves
    USER_PROFILE ||--o{ STUDY_PLAN : requests
    STUDY_PLAN ||--|{ STUDY_ACTIVITY : contains
    USER_PROFILE ||--o{ TUTOR_SESSION : starts
    TUTOR_SESSION ||--o{ FLASHCARD : exports
    USER_PROFILE ||--o{ BADGE : unlocks

    USER_PROFILE ||--o{ CHAT_PROFILE : has
    CHAT_SERVER ||--|{ CHAT_CHANNEL : contains
    CHAT_CHANNEL ||--o{ COMMUNITY_MESSAGE : receives
    USER_PROFILE ||--o{ COMMUNITY_MESSAGE : authors
    CHAT_CHANNEL ||--o{ CHAT_PRESENCE : tracks
    USER_PROFILE ||--o{ CHAT_PRESENCE : reports
    USER_PROFILE ||--o{ CHAT_CONVERSATION : participates
    CHAT_CONVERSATION ||--o{ DIRECT_MESSAGE : contains
    USER_PROFILE ||--o{ DIRECT_MESSAGE : sends
    USER_PROFILE ||--o{ CHAT_REPORT : files

    USER_PROFILE {
        string uid PK
        string email
        string name
        string age_cohort
        string mode
    }
    LEARNER_PROGRESS {
        int study_minutes_today
        int daily_goal_minutes
        int streak
        int xp
        json youtube_watch_time
        json badges
    }
    FLASHCARD {
        string id PK
        string front
        string back
        string source
        string topic
    }
    STUDY_PLAN {
        string id PK
        string class_level
        string exam_goal
        string topic
        int goal_minutes
        string source
    }
    STUDY_ACTIVITY {
        string route
        string task
        string pedagogy
        string duration
    }
    TUTOR_SESSION {
        string query
        string final_answer
        string status
        int confidence_score
        string model_used
    }
    BADGE {
        string id PK
        string kind
        string unlocked_at
    }
    CHAT_SERVER {
        string id PK
        string name
        string cohort
    }
    CHAT_CHANNEL {
        string id PK
        string name
        string topic
        bool is_private
    }
    COMMUNITY_MESSAGE {
        string id PK
        string channel_id FK
        string user_id FK
        string content
        string created_at
    }
    CHAT_PROFILE {
        string uid PK
        string display_name
        string class_or_exam
        bool is_visible
    }
    CHAT_PRESENCE {
        string user_id PK
        string channel_id FK
        string status
        string last_seen_at
    }
    CHAT_CONVERSATION {
        string id PK
        string participant_ids
        string last_ts
    }
    DIRECT_MESSAGE {
        string id PK
        string conversation_id FK
        string sender_id FK
        string text
        string ts
    }
    CHAT_REPORT {
        string id PK
        string reporter_id FK
        string reported_id FK
        string reason
    }
```

### Storage ownership

- `USER_PROFILE`, `LEARNER_PROGRESS`, `FLASHCARD`, `STUDY_PLAN`, and `BADGE` are currently serialized through `AppContext` into browser storage for local-first use.
- Authenticated Express users can also persist documents through `/api/db`, backed by `data.json` in this local deployment.
- `CHAT_CHANNEL`, `COMMUNITY_MESSAGE`, `CHAT_PRESENCE`, and related chat entities belong to the sidecar. The local sidecar uses JSON; `sidecar/schema.sql` defines the additive relational shape for a shared database.
- `TUTOR_SESSION` and provider responses are request-scoped. They are not automatically persisted unless the caller exports the result into progress, flashcards, notes, or community sharing.

## 5. End-to-end flow charts

### Tutor question and audited answer

```mermaid
flowchart LR
    q["Learner submits question"] --> ui["AITutorView"]
    ui --> req["POST /api/tutor\nquery + cohort + model"]
    req --> draft["FastAPI Groq draft"]
    draft --> audit["Second Groq consistency pass"]
    audit --> normalize["Pydantic response\nstatus, confidence, answer, cards"]
    normalize --> render["Answer + audit panel"]
    normalize --> export["pushFlashcards / awardXP\nwhen returned by policy"]
    draft -. audit unavailable .-> local["Local structure check\nQuestioned fallback"]
    local --> render
```

### Study-plan generation and launch

```mermaid
flowchart TD
    form["Dashboard plan form\ncohort + class + goal + topic + target"] --> post["POST /api/study-plan"]
    post --> provider{"Provider available?"}
    provider -->|Groq| groqplan["Groq returns 3 validated items"]
    provider -->|No| geminiplan["Optional Gemini fallback"]
    geminiplan -->|No| offlineplan["Deterministic plan builder"]
    groqplan --> validate["Normalize allowed first-party routes"]
    offlineplan --> validate
    validate --> cards["Plan cards rendered on dashboard"]
    cards --> launch["Launch Study Plan Session"]
    launch --> route{"Activity route"}
    route -->|video| videos["Resources: Videos"]
    route -->|pyq| pyq["Resources: PYQ"]
    route -->|study| study["Study: tutor / flashcards"]
    route -->|dashboard| notes["Dashboard notes"]
```

### Community message safety and delivery

```mermaid
flowchart TD
    compose["User types message"] --> clean["sanitizeCommunityText()\nPII + length cleanup"]
    clean --> detect["detectAbusiveLanguage()"]
    detect --> cohort{"Junior/Teen cohort?"}
    cohort -->|Yes + abusive| warn["Block send\nshow warning\nmessage never enters history"]
    cohort -->|No abuse or Senior| local["Store filtered local history"]
    local --> sidecar["Optional REST/WebSocket sidecar"]
    sidecar --> broadcast["Channel broadcast + presence update"]
    broadcast --> render["Filter by server/channel/cohort\nrender in CommunityView"]
```

## 6. Important invariants

1. Provider keys stay in `.env` files read by Node or FastAPI; they are never embedded in `public/bundle.js`.
2. All AI routes return structured data before UI state is updated. The frontend can therefore preserve the existing answer/cards when a later audit or provider is unavailable.
3. Study-plan routes are allow-listed by the FastAPI response normalizer before the frontend navigates, preventing generated text from becoming an arbitrary external link.
4. Community moderation runs before local rendering for youth cohorts. Senior policy is intentionally different, but PII sanitization still applies.
5. `public/bundle.js` is generated from `src/index.jsx` by `build.js`; edit source modules, then rebuild.

## 7. Related source references

- [CODEBASE_GUIDE.md](CODEBASE_GUIDE.md) — maintained module catalog and connection notes.
- [server.js](server.js) — Express host, auth, document store, and offline AI route.
- [backend/server.py](backend/server.py) — FastAPI tutor, audit, flashcard, and study-plan routes.
- [sidecar/chat-server.js](sidecar/chat-server.js) — isolated community REST/WebSocket service.
- [sidecar/schema.sql](sidecar/schema.sql) — optional relational chat schema.
