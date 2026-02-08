# Slack Clone — Developer Context & Architecture

## Overview

| Field | Value |
|-------|-------|
| Goal | Real-time chat app with channels, auth, message persistence |
| Timeline | 7-day sprint |
| Tech Stack | React, Node/Express, Socket.io, PostgreSQL |
| Team | Ismael (backend/sockets/db), Manny (frontend/UI/styling) |

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐     SQL      ┌────────────┐
│   React UI  │ ◄──────────────► │  Express API  │ ◄──────────► │ PostgreSQL │
│   (Client)  │     Socket.io     │  + Socket.io  │   Queries    │   (Data)   │
└─────────────┘                    └──────────────┘              └────────────┘
       │                                  │
       │  HTTP (Auth, REST)               │
       └──────────────────────────────────┘
```

### Data Flow
1. User opens app → React loads → checks JWT in localStorage
2. If no token → show Login/Signup page
3. If valid token → connect Socket.io, load channel list
4. User clicks channel → REST GET `/api/messages/:channelId` → render history
5. User sends message → Socket.io `emit('sendMessage')` → server broadcasts to channel room → saves to DB
6. All clients in that channel room receive the message instantly

## Database Schema

### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Channels
```sql
CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Messages
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  channel_id INTEGER REFERENCES channels(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx          ← Channel list + DM list
│   │   ├── ChatWindow.jsx       ← Message display area
│   │   ├── MessageInput.jsx     ← Text input + send button
│   │   ├── Message.jsx          ← Single message bubble (name, text, time)
│   │   └── UserList.jsx         ← Online users (stretch)
│   ├── pages/
│   │   ├── Login.jsx            ← Login form
│   │   ├── Signup.jsx           ← Registration form
│   │   └── Chat.jsx             ← Main chat layout (sidebar + chat window)
│   ├── hooks/
│   │   ├── useSocket.js         ← Socket.io connection hook
│   │   └── useAuth.js           ← Auth state management
│   └── styles/
│       ├── Sidebar.module.css
│       ├── ChatWindow.module.css
│       └── global.css
│
server/
├── index.js                      ← Express + Socket.io setup
├── routes/
│   ├── auth.js                   ← POST /signup, POST /login
│   ├── channels.js               ← GET /channels
│   └── messages.js               ← GET /messages/:channelId
├── models/
│   ├── User.js                   ← User queries
│   ├── Channel.js                ← Channel queries
│   └── Message.js                ← Message queries
├── middleware/
│   └── auth.js                   ← JWT verification middleware
├── sockets/
│   └── chatHandler.js            ← Socket.io event handlers
└── config/
    └── db.js                     ← PostgreSQL connection pool
```

## Key Interface Contracts

### REST API
```
POST /api/auth/signup      { username, password } → { token, user }
POST /api/auth/login       { username, password } → { token, user }
GET  /api/channels         → [{ id, name }]
GET  /api/messages/:id     → [{ id, content, username, created_at }]
```

### Socket.io Events
```
Client → Server:
  'joinChannel'    { channelId }
  'leaveChannel'   { channelId }
  'sendMessage'    { channelId, content }

Server → Client:
  'newMessage'     { id, content, username, channelId, created_at }
  'userJoined'     { username, channelId }
  'userLeft'       { username, channelId }
```

## Branch Strategy

| Branch | Owner | Purpose |
|--------|-------|---------|
| main | both | Production-ready code |
| dev | both | Integration branch |
| feature/auth | Ismael | User authentication |
| feature/sockets | Ismael | Socket.io integration |
| feature/db | Ismael | Database schema & queries |
| feature/ui-layout | Manny | Sidebar + Chat layout |
| feature/components | Manny | React components |
| feature/styling | Manny | CSS and polish |

## Development Workflow
1. Branch off `dev` for features
2. PR into `dev` with review from partner
3. Merge `dev` into `main` after testing
