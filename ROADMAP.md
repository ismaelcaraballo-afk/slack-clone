# Sprint Roadmap — Slack Clone MVP

## Timeline: 7 Days

---

### Day 1-2: Foundation
**Goal:** Database, Auth, Basic UI Layout

#### Ismael (Backend)
- [ ] Initialize Express server with Socket.io
- [ ] Set up PostgreSQL connection pool
- [ ] Create database schema (users, channels, messages)
- [ ] Seed #general and #random channels
- [ ] Build auth routes (POST /signup, POST /login)
- [ ] Implement JWT middleware
- [ ] Build message routes (GET /messages/:channelId)
- [ ] Build channel routes (GET /channels)

#### Manny (Frontend)
- [ ] Initialize React app
- [ ] Create Login and Signup pages
- [ ] Build main Chat layout (Sidebar + ChatWindow + MessageInput)
- [ ] Create Sidebar component with channel list
- [ ] Create Message component (name, text, timestamp)
- [ ] Set up CSS modules / base styling
- [ ] Connect auth forms to backend API

**Sync Point:** Both test signup → login → see channels

---

### Day 3-4: Real-Time (The Handshake)
**Goal:** Send a message on one computer, it appears on the other

#### Ismael (Backend)
- [ ] Set up Socket.io event handlers (joinChannel, sendMessage)
- [ ] Broadcast messages to channel rooms
- [ ] Save messages to database on send
- [ ] Handle user join/leave events

#### Manny (Frontend)
- [ ] Create useSocket hook for Socket.io connection
- [ ] Wire MessageInput to emit sendMessage events
- [ ] Listen for newMessage events and render in ChatWindow
- [ ] Implement channel switching (joinChannel/leaveChannel)

**Sync Point:** "The Handshake" — two browsers, one conversation, zero refresh

---

### Day 5: Data Persistence
**Goal:** Messages load from DB, survive refresh

#### Ismael
- [ ] Ensure messages save with correct user_id and channel_id
- [ ] Add message history endpoint with JOIN for usernames
- [ ] Test: send message → refresh → message still there

#### Manny
- [ ] Fetch message history on channel load (GET /messages/:id)
- [ ] Render history before live messages
- [ ] Handle loading states

**Sync Point:** Refresh the page — all messages still there

---

### Day 6: Polish
**Goal:** Look and feel like Slack

#### Both
- [ ] Auto-scroll to bottom on new messages
- [ ] Slack-like color scheme and layout
- [ ] Responsive sidebar
- [ ] Error handling (failed sends, disconnects)
- [ ] Clean up console logs and dead code

---

### Day 7: Submission
**Goal:** Bug-free, demo-ready

#### Both
- [ ] End-to-end testing (signup → login → chat → refresh)
- [ ] README updated with final instructions
- [ ] Deploy to Render/Vercel (optional)
- [ ] Record demo or prepare live walkthrough
- [ ] Submit to Pathfinder

---

## Team Responsibilities

| Area | Owner | Key Files |
|------|-------|-----------|
| Express API | Ismael | server/routes/, server/index.js |
| Database | Ismael | server/models/, server/config/db.js |
| Socket.io (server) | Ismael | server/sockets/chatHandler.js |
| Auth (JWT) | Ismael | server/middleware/auth.js |
| React Components | Manny | client/src/components/ |
| Pages & Routing | Manny | client/src/pages/ |
| Socket.io (client) | Manny | client/src/hooks/useSocket.js |
| Styling | Manny | client/src/styles/ |

## Risk & Contingency

| Risk | Mitigation |
|------|-----------|
| Socket.io connection issues | Fall back to polling, test early on Day 3 |
| DB schema changes mid-sprint | Keep schema simple, use migrations |
| Merge conflicts | Use feature branches, PR reviews, daily syncs |
| Auth complexity | Start with basic JWT, skip OAuth for MVP |
| Time crunch | DMs are stretch goal, cut if needed |

## Success Criteria

- [ ] Two users chat in real-time without refresh
- [ ] Messages persist after browser reload
- [ ] Zero ghost messages
- [ ] Channel switching loads correct history
- [ ] Clean, Slack-like UI
