# Lesson 1: Real-Time Messaging with Socket.io

## What You'll Learn
- How WebSockets differ from HTTP (persistent connections)
- Setting up Socket.io on Express (server) and React (client)
- Event-driven architecture: emit, on, broadcast
- Rooms for channels and DMs
- Typing indicators and online presence
- Multi-tab deduplication

## Project Context
The Slack Clone uses Socket.io for instant message delivery, typing indicators ("Ismael is typing..."), and online presence (green dot = online). HTTP would require polling every second — Socket.io pushes events instantly.

---

## Part 1: HTTP vs WebSockets

**HTTP (request/response):**
```
Client: "Any new messages?"  --> Server: "Nope"
Client: "Any new messages?"  --> Server: "Nope"
Client: "Any new messages?"  --> Server: "Yes, here's one!"
```
Wasteful — most requests return nothing.

**WebSocket (persistent connection):**
```
Client <--connected--> Server
Server: "New message arrived!" (pushed instantly)
Server: "User X is typing..."  (pushed instantly)
```
One connection stays open. Server pushes data the moment it happens.

**Socket.io** wraps WebSockets with: automatic reconnection, fallback to HTTP long-polling, rooms/namespaces, and acknowledgments.

---

## Part 2: Server Setup

### Socket.io on Express
```js
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Attach socket handlers
require("./sockets/handlers")(io);

server.listen(PORT);
```

**Why `http.createServer(app)` instead of `app.listen()`?**
Socket.io needs the raw HTTP server object, not just the Express app. `app.listen()` creates a server internally but doesn't expose it.

### Event Handlers
```js
module.exports = function(io) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a channel room
    socket.on("join_channel", (channelId) => {
      socket.join(`channel_${channelId}`);
    });

    // Send a message
    socket.on("send_message", async (data) => {
      // Save to database
      const message = await Message.create({
        channel_id: data.channelId,
        user_id: data.userId,
        content: data.content
      });

      // Broadcast to everyone in the channel (except sender)
      socket.to(`channel_${data.channelId}`).emit("new_message", message);
    });

    // Typing indicator
    socket.on("typing_start", (data) => {
      socket.to(`channel_${data.channelId}`).emit("user_typing", {
        userId: data.userId,
        username: data.username
      });
    });

    socket.on("typing_stop", (data) => {
      socket.to(`channel_${data.channelId}`).emit("user_stopped_typing", {
        userId: data.userId
      });
    });

    // Online presence
    socket.on("user_online", (userId) => {
      socket.userId = userId;
      io.emit("presence_update", { userId, status: "online" });
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        io.emit("presence_update", { userId: socket.userId, status: "offline" });
      }
    });
  });
};
```

**Key patterns:**
- `socket.on("event", callback)` — listen for events from ONE client
- `socket.emit("event", data)` — send to ONE client
- `socket.to("room").emit(...)` — send to everyone in a room EXCEPT the sender
- `io.to("room").emit(...)` — send to EVERYONE in a room (including sender)
- `io.emit(...)` — send to ALL connected clients
- `socket.join("room")` — add this socket to a room

### Rooms = Channels
When a user opens #general, their socket joins room `channel_1`. When someone sends a message to #general, it's broadcast to room `channel_1`. Only users currently viewing that channel receive it.

---

## Part 3: Client Setup

### Socket Hook
```jsx
import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";

export function useSocket(user) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const socket = io("http://localhost:3001", {
      auth: { token: localStorage.getItem("token") }
    });

    socket.on("connect", () => {
      socket.emit("user_online", user.id);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return socketRef;
}
```

**Cleanup is critical:** The `return () => socket.disconnect()` ensures the connection is closed when the component unmounts or the user logs out. Without it, zombie connections pile up.

### Listening for Messages
```jsx
useEffect(() => {
  if (!socket) return;

  socket.on("new_message", (message) => {
    setMessages((prev) => [...prev, message]);
  });

  return () => {
    socket.off("new_message");
  };
}, [socket]);
```

`socket.off("new_message")` in cleanup prevents duplicate listeners if the effect re-runs.

### Sending Messages
```jsx
const sendMessage = () => {
  if (!content.trim()) return;

  socket.emit("send_message", {
    channelId: currentChannel.id,
    userId: user.id,
    content: content.trim()
  });

  // Optimistic update — show message immediately
  setMessages((prev) => [...prev, {
    content: content.trim(),
    username: user.username,
    created_at: new Date().toISOString()
  }]);

  setContent("");
};
```

**Optimistic update:** Don't wait for the server to confirm — show the message instantly. If the server fails, you'd roll it back (not implemented in MVP, but good practice).

---

## Part 4: Typing Indicators

### Client sends typing events
```jsx
const handleTyping = () => {
  if (!isTyping) {
    setIsTyping(true);
    socket.emit("typing_start", {
      channelId: currentChannel.id,
      userId: user.id,
      username: user.username
    });
  }

  // Clear previous timeout
  clearTimeout(typingTimeout.current);

  // Stop typing after 2 seconds of no keystrokes
  typingTimeout.current = setTimeout(() => {
    setIsTyping(false);
    socket.emit("typing_stop", {
      channelId: currentChannel.id,
      userId: user.id
    });
  }, 2000);
};
```

**The timeout pattern:** Every keystroke resets a 2-second timer. If the user stops typing for 2 seconds, a "stop" event fires. This prevents spamming the server with events on every single keystroke.

### Client displays typing
```jsx
useEffect(() => {
  socket.on("user_typing", ({ username }) => {
    setTypingUsers((prev) => [...new Set([...prev, username])]);
  });

  socket.on("user_stopped_typing", ({ userId }) => {
    setTypingUsers((prev) => prev.filter((u) => u !== userId));
  });

  return () => {
    socket.off("user_typing");
    socket.off("user_stopped_typing");
  };
}, [socket]);

// In JSX:
{typingUsers.length > 0 && (
  <p className={styles.typing}>
    {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
  </p>
)}
```

---

## Part 5: Online Presence

### Server tracks connected users
```js
const onlineUsers = new Map(); // userId -> Set of socketIds

socket.on("user_online", (userId) => {
  socket.userId = userId;
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);
  io.emit("presence_update", { userId, status: "online" });
});

socket.on("disconnect", () => {
  if (socket.userId) {
    const sockets = onlineUsers.get(socket.userId);
    if (sockets) {
      sockets.delete(socket.id);
      // Only mark offline if NO tabs remain
      if (sockets.size === 0) {
        onlineUsers.delete(socket.userId);
        io.emit("presence_update", { userId: socket.userId, status: "offline" });
      }
    }
  }
});
```

**Multi-tab deduplication:** One user can have 3 browser tabs open = 3 socket connections. The `Map<userId, Set<socketId>>` tracks all connections per user. Only when the LAST tab closes does the user go "offline". Without this, closing one tab would show them as offline while they're still active in another.

---

## Part 6: Direct Messages

DMs use a "conversation" model — two users share a private conversation room.

```js
socket.on("join_dm", (conversationId) => {
  socket.join(`dm_${conversationId}`);
});

socket.on("send_dm", async (data) => {
  const message = await DirectMessage.create({
    conversation_id: data.conversationId,
    sender_id: data.userId,
    content: data.content
  });
  socket.to(`dm_${data.conversationId}`).emit("new_dm", message);
});
```

Same room pattern as channels, but the room only has 2 members.

---

## Exercises

1. **Add message editing:** Emit an "edit_message" event. Server updates the DB and broadcasts the edit to the channel.
2. **Add read receipts:** Track when each user last read each channel. Show unread counts in the sidebar.
3. **Add reconnection handling:** When a socket reconnects after a network drop, fetch missed messages from the API.

## Key Takeaways
- Socket.io enables push-based communication (server -> client instantly)
- Rooms map perfectly to chat channels and DM conversations
- Typing indicators use a timeout pattern (2s debounce)
- Multi-tab dedup: track socketIds per userId, only go offline when last tab closes
- Always clean up listeners (`socket.off`) and connections (`socket.disconnect`) on unmount
