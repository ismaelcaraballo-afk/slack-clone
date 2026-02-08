# Slack Clone MVP

A lightweight, real-time communication platform built for Pursuit. Two users can hold a conversation in real-time across organized channels — no page refresh needed.

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start the development servers (backend + frontend)
npm run dev
```

The client runs on `http://localhost:3000` and the server on `http://localhost:3001`.

## Features

| Feature | Description |
|---------|-------------|
| User Auth | Sign up / log in with username & password |
| Channels | Sidebar with #general and #random channels |
| Real-Time Chat | Messages appear instantly via WebSockets |
| Message History | Chat persists after logout/refresh |
| Timestamps | Every message shows sender name + time |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + CSS Modules |
| Backend | Node.js + Express |
| Real-Time | Socket.io |
| Database | PostgreSQL |
| Auth | JWT |

## Project Structure

```
slack-clone/
├── client/               ← React frontend
│   ├── src/
│   │   ├── components/   ← Reusable UI components
│   │   ├── pages/        ← Page-level views
│   │   ├── hooks/        ← Custom React hooks
│   │   └── styles/       ← CSS modules
│   └── public/
├── server/               ← Express backend
│   ├── routes/           ← API endpoints
│   ├── models/           ← Database models
│   ├── middleware/        ← Auth middleware
│   ├── sockets/          ← Socket.io event handlers
│   └── config/           ← DB and env config
├── docs/                 ← Project documentation
│   ├── PRD.md            ← Product requirements
│   └── TESTING.md        ← Testing guide
├── AGENT.md              ← Architecture & developer context
└── ROADMAP.md            ← Sprint plan & team responsibilities
```

## Development

```bash
# Run backend only
cd server && npm run dev

# Run frontend only
cd client && npm start

# Run tests
npm test
```

## Team

- **Ismael Caraballo** — Backend, WebSockets, Database
- **Manny (OasisView)** — Frontend, UI Components, Styling

## Docs

- [Product Requirements (PRD)](docs/PRD.md)
- [Architecture & Context (AGENT.md)](AGENT.md)
- [Sprint Roadmap](ROADMAP.md)
