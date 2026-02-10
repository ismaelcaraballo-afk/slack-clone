# Slack Clone — Frontend Guide for Manny

## Setup

1. Pull latest:

### Database (one-time setup)

You need PostgreSQL running before the backend will work.

```bash
# Install PostgreSQL
brew install postgresql@17

# Start it (and auto-start on reboot)
brew services start postgresql@17

# Create the database
createdb slack_clone

# Go to the server folder and install dependencies
cd ~/slack-clone/server
npm install

# Copy the env file
cp .env.example .env

# Seed the database (creates tables + default channels)
npm run seed
```

You should see: `Channels seeded: [ { id: 1, name: 'general' }, { id: 2, name: 'random' } ]`

If `createdb` is not found, add PostgreSQL to your PATH:
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

```bash
cd ~/slack-clone
git pull origin main
```

2. Set up the React app:
```bash
cd client
npm create vite@latest . -- --template react
npm install socket.io-client axios react-router-dom
```

3. Start the backend (separate terminal):
```bash
cd ~/slack-clone/server
npm start
```
Server runs on http://localhost:3001

4. Start the frontend:
```bash
cd ~/slack-clone/client
npm start
```
React runs on http://localhost:3000

---

## API Endpoints

All endpoints (except signup/login) need this header:
```
Authorization: Bearer <token>
```

### Auth
| Method | URL | Body | Response |
|--------|-----|------|----------|
| POST | `/api/auth/signup` | `{ "username": "...", "password": "..." }` | `{ "token": "...", "user": { "id": 1, "username": "..." } }` |
| POST | `/api/auth/login` | `{ "username": "...", "password": "..." }` | `{ "token": "...", "user": { "id": 1, "username": "..." } }` |

### Channels
| Method | URL | Body | Response |
|--------|-----|------|----------|
| GET | `/api/channels` | — | `[{ "id": 1, "name": "general", "created_at": "..." }]` |
| POST | `/api/channels` | `{ "name": "new-channel" }` | `{ "id": 3, "name": "new-channel", "created_at": "..." }` |

### Messages
| Method | URL | Body | Response |
|--------|-----|------|----------|
| GET | `/api/messages/:channelId` | — | `[{ "id": 1, "content": "...", "username": "...", "channel_id": 1, "created_at": "..." }]` |

---

## Socket.io — Real-Time Chat

### IMPORTANT: You MUST use websocket transport only

Express 5 has a bug with Socket.io's polling transport. Always connect like this:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  auth: { token: localStorage.getItem("token") },
  transports: ["websocket"],
});
```

If you forget `transports: ["websocket"]` you'll get `xhr poll error` and nothing will work.

### Events to SEND (client -> server)

**Join a channel:**
```js
socket.emit("joinChannel", { channelId: 1 });
```

**Send a message:**
```js
socket.emit("sendMessage", { channelId: 1, content: "Hello!" });
```

### Events to LISTEN (server -> client)

**Receive new messages:**
```js
socket.on("newMessage", (msg) => {
  // msg = { id, content, username, channel_id, created_at }
  console.log(msg.username + ": " + msg.content);
});
```

**Error handling:**
```js
socket.on("error", (err) => {
  console.error(err.message);
});

socket.on("connect_error", (err) => {
  // Token expired or invalid
  console.error(err.message);
});
```

---

## Pages You Need

### 1. Login / Signup Page
- Form with username + password
- POST to `/api/auth/login` or `/api/auth/signup`
- Save the token to `localStorage`
- Redirect to chat on success

### 2. Chat Page (main page)
- Left sidebar: channel list (GET `/api/channels`)
- Create channel button (POST `/api/channels`)
- Main area: messages for selected channel
- On channel click: `socket.emit("joinChannel")` + GET `/api/messages/:channelId`
- Message input at bottom: `socket.emit("sendMessage")` on submit
- Listen for `socket.on("newMessage")` to add new messages in real time

---

## Suggested File Structure
```
client/src/
  components/
    ChannelList.jsx    — sidebar with channel names
    MessageList.jsx    — scrollable message area
    MessageInput.jsx   — text input + send button
    ChannelCreate.jsx  — form to create new channel
  pages/
    Login.jsx          — login/signup form
    Chat.jsx           — main chat layout
  hooks/
    useSocket.js       — socket connection + event listeners
  App.jsx              — routes (Login vs Chat)
```

---

## Quick Test

After setup, test that your frontend can talk to the backend:

```js
// In any component or browser console:
const res = await fetch("http://localhost:3001/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "manny", password: "test1234" }),
});
const data = await res.json();
console.log(data); // Should see { token: "...", user: { id: ..., username: "manny" } }
```

---

## Error Codes to Handle
| Code | Meaning |
|------|---------|
| 400 | Missing/invalid input |
| 401 | Bad credentials or expired token |
| 409 | Username or channel name already taken |
| 500 | Server error |

---

## Questions?
Ask Ismael or check: AGENT.md, ROADMAP.md, docs/PRD.md
