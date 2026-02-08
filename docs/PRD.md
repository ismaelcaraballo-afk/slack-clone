# PRD: Slack Clone (MVP)

## 1. Product Overview

**Project Name:** Slack Clone MVP
**Mission:** Create a lightweight, real-time communication platform that allows users to send and receive messages instantly in organized channels.
**Target Audience:** Students and small teams needing a focused, real-time chat tool.

## 2. Target Features (MVP)

For a 1-week sprint, we are prioritizing the "Happy Path" of messaging:

### Core Features
- **User Authentication** — Users can sign up and log in to identify their messages
- **Channel Navigation** — A sidebar with at least two channels (#general, #random)
- **Real-Time Messaging** — WebSocket-powered instant messages, no page refresh
- **Message Persistence** — Chat history stored in database, survives logout/refresh
- **Timestamps & Identity** — Every message shows sender name and time sent

### Stretch Goals
- Direct Messages (DMs) between users
- Online/offline user presence indicators
- Message editing and deletion

## 3. Technical Approach

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React.js | Dynamic UI updates |
| Styling | CSS Modules | Slack-like layout |
| Backend | Node.js + Express | API requests, auth |
| Real-Time | Socket.io | WebSocket connections |
| Database | PostgreSQL | Users, channels, messages |
| Auth | JWT + bcrypt | Secure token-based auth |

## 4. User Stories

1. As a user, I can **create an account** so that my identity is attached to my messages
2. As a user, I can **log in** and be taken to the chat interface
3. As a user, I can **see a list of channels** in the sidebar so I know where to join
4. As a user, I can **click a channel** and see its message history
5. As a user, I can **send a message** and see it appear instantly in the chat window
6. As a user, I can **view the history** of a channel to catch up on previous discussions
7. As a user, I can **see who sent each message** and when it was sent

## 5. Success Metrics

- Two users can hold a conversation in real-time without refreshing
- Messages persist after a browser reload
- Zero "ghost" messages (messages sent but not saved)
- Channel switching loads correct message history
- Auth prevents unauthorized access to chat
