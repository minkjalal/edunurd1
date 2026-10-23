# 💬 EduNerd Community Zone - Discord-like Real-Time Chat Extension
## Zero-Touch Sidecar Microservice & Drop-In Web Component

This module provides a full-featured, real-time channel-based chat experience for the **Community Zone** of EduNerd, strictly adhering to the **Golden Rule of Zero Regressions**:

> **Zero Modifications to Existing Codebase**:  
> No existing tables or columns are altered. No existing backend controllers, routes, or auth middlewares are modified. The chat runs as a loosely-coupled sidecar extension.

---

## 🏗️ Architecture & Component Topology

```
┌────────────────────────────────────────────────────────┐
│               Existing Application                     │
│  Port 3000 (Express SPA + REST API)                    │
│                                                        │
│  Existing Community View:                              │
│  <div id="ag-discord-mount"></div>                     │
│  <script src="/ag-discord-widget.js"></script>         │
└──────────────▲─────────────────────────────────────────┘
               │ (Passive read of en_token in localStorage)
               ▼
┌────────────────────────────────────────────────────────┐
│             Chat Sidecar Microservice                  │
│  Port 3001 (Node.js HTTP REST + WebSockets)            │
│  sidecar/chat-server.js                                │
│                                                        │
│  • Passive JWT Verification (Read-only shared secret)  │
│  • Channel Message Broadcasting (#general, #doubts...) │
│  • Live Presence (online/offline heartbeat)            │
│  • Real-time typing indicators with auto-expiry        │
│  • Additive JSON / SQL Persistence Engine              │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Capabilities

1. **Channel-Based Chat**:
   - Left-hand navigation sidebar displaying `# general`, `# doubts-and-questions`, `# study-lounge`, `# resources-and-notes`, `# exam-prep-pyq`.
   - Real-time channel switching with unread message badges.
2. **Real-Time WebSockets**:
   - Instant bi-directional messaging with sub-10ms delivery.
   - Typing indicators with auto-debounce and 3-second server auto-expiry.
   - Markdown parsing: `**bold**`, `*italic*`, `~~strike~~`, `` `inline code` ``, ` ```codeblocks``` `, `@mentions`, and clickable links.
3. **User Presence**:
   - Right-hand sidebar tracking online/offline status with live green indicators.
   - Automatic connection drop detection via 30s heartbeat sweeps.
4. **Passive Read-Only Auth**:
   - Authenticated users are passively verified using the existing `JWT_SECRET` in `.env`.
   - Unauthenticated visitors gracefully receive a guest identity (`Guest_1234`), enabling preview access without hard blocks.
5. **Zero CSS Collisions**:
   - Every CSS rule is strictly prefixed with `ag-chat-*` ensuring 100% style isolation from parent templates.

---

## 🛠️ Step-by-Step Deployment Instructions

### 1. Database Setup (100% Additive)
Execute `sidecar/schema.sql` against your database (PostgreSQL, MySQL, SQLite, or Supabase).  
*Note: For local development, the sidecar automatically falls back to `sidecar/chat-data.json`, requiring zero manual DB commands to get started.*

```bash
# Example for PostgreSQL:
psql -d edunerd_db -f sidecar/schema.sql

# Example for SQLite:
sqlite3 data.db < sidecar/schema.sql
```

### 2. Starting the Backend Sidecar Server
The chat server runs as an independent daemon alongside the main application.

```powershell
# In the project root:
node sidecar/chat-server.js
```
The server will bind to port **3001** (or custom `CHAT_PORT` env):
- **REST Endpoints:** `http://localhost:3001`
- **WebSocket Gateway:** `ws://localhost:3001/ws/chat`
- **Health Check:** `http://localhost:3001/health`

### 3. Frontend Drop-In Integration

#### Option A: Single Mount Point (Standard)
Place this mount point in your Community template or component:
```html
<div id="ag-discord-mount"></div>
<script src="/ag-discord-widget.js"></script>
```

#### Option B: Declarative Web Component
Use the registered custom element:
```html
<ag-discord-chat></ag-discord-chat>
<script src="/ag-discord-widget.js"></script>
```

#### Option C: Programmatic React / Vanilla Mount
```javascript
import { useEffect } from 'react';

export default function CommunityChatSection() {
  useEffect(() => {
    if (window.AgDiscordChat) {
      window.AgDiscordChat.mount('#my-chat-container');
    }
  }, []);

  return <div id="my-chat-container"></div>;
}
```

---

## 🔌 API & Event Specification

### WebSocket Message Protocol
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `ready` | Server → Client | `{ user, channels, activeChannel, history }` | Handshake initialization |
| `join_channel` | Client → Server | `{ type: "join_channel", channelId }` | Switch active room |
| `send_message` | Client → Server | `{ type: "send_message", content }` | Broadcast new message |
| `new_message` | Server → Client | `{ type: "new_message", message }` | Delivered chat payload |
| `typing` | Client → Server | `{ type: "typing" }` | Signal typing activity |
| `user_typing` | Server → Client | `{ channelId, userId, userName }` | Peer typing notification |
| `presence_sync`| Server → Client | `{ members: [...], totalOnline }` | Full presence roster |
| `ping` / `pong` | Bi-directional | `{ type: "ping" }` | Connection liveness check |
