# Lesson 3: Testing Real-Time Apps (68 Tests)

## What You'll Learn
- Testing Socket.io events with socket.io-client
- Testing REST endpoints with Supertest
- Async test patterns (waiting for socket events)
- Test isolation with database cleanup
- Testing DM flows, auth flows, and edge cases

## Project Context
The Slack Clone has 68 tests across 6 suites: 24 socket tests, 14 DM tests, 11 auth tests, 7 channel tests, 6 message tests, 6 user tests. The socket tests are the most interesting because they test real-time behavior.

---

## Part 1: The Challenge of Testing Sockets

HTTP tests are simple: send request, check response. Socket tests are harder because:
- Events are async and may arrive at any time
- You need multiple clients to test broadcasts
- You need to wait for events without blocking forever
- Cleanup must disconnect all sockets

### Helper: Wait for a socket event
```js
function waitForEvent(socket, event, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${event}" event`));
    }, timeout);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
```

This converts callback-based socket events into Promises you can `await`. The timeout prevents tests from hanging forever if an event never fires.

---

## Part 2: Socket Test Setup

```js
const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const app = require("../app");

let io, httpServer, clientSocket1, clientSocket2;

beforeAll((done) => {
  httpServer = createServer(app);
  io = new Server(httpServer);
  require("../sockets/handlers")(io);
  httpServer.listen(() => {
    const port = httpServer.address().port;
    clientSocket1 = Client(`http://localhost:${port}`);
    clientSocket2 = Client(`http://localhost:${port}`);

    let connected = 0;
    const checkDone = () => { if (++connected === 2) done(); };
    clientSocket1.on("connect", checkDone);
    clientSocket2.on("connect", checkDone);
  });
});

afterAll(() => {
  clientSocket1.disconnect();
  clientSocket2.disconnect();
  io.close();
  httpServer.close();
});
```

**What's happening:**
1. Start a real HTTP + Socket.io server on a random port
2. Create two client sockets (simulating two users)
3. Wait for both to connect before running tests
4. Cleanup: disconnect everything after tests

---

## Part 3: Testing Message Broadcast

```js
it("should broadcast message to channel members", async () => {
  // Both users join the same channel
  clientSocket1.emit("join_channel", 1);
  clientSocket2.emit("join_channel", 1);

  // Set up listener BEFORE sending (order matters!)
  const messagePromise = waitForEvent(clientSocket2, "new_message");

  // User 1 sends a message
  clientSocket1.emit("send_message", {
    channelId: 1,
    userId: 1,
    content: "Hello everyone!"
  });

  // User 2 should receive it
  const received = await messagePromise;
  expect(received.content).toBe("Hello everyone!");
  expect(received.user_id).toBe(1);
});

it("should NOT receive messages from other channels", async () => {
  clientSocket1.emit("join_channel", 1);
  clientSocket2.emit("join_channel", 2); // different channel!

  let received = false;
  clientSocket2.on("new_message", () => { received = true; });

  clientSocket1.emit("send_message", {
    channelId: 1, userId: 1, content: "Secret message"
  });

  // Wait a bit, then verify no message arrived
  await new Promise(r => setTimeout(r, 500));
  expect(received).toBe(false);
});
```

**Testing negative cases** (something should NOT happen) requires waiting a reasonable time and checking that the event never fired.

---

## Part 4: Testing Typing Indicators

```js
it("should broadcast typing indicator", async () => {
  clientSocket1.emit("join_channel", 1);
  clientSocket2.emit("join_channel", 1);

  const typingPromise = waitForEvent(clientSocket2, "user_typing");

  clientSocket1.emit("typing_start", {
    channelId: 1,
    userId: 1,
    username: "ismael"
  });

  const data = await typingPromise;
  expect(data.username).toBe("ismael");
});

it("should broadcast typing stop", async () => {
  const stopPromise = waitForEvent(clientSocket2, "user_stopped_typing");

  clientSocket1.emit("typing_stop", {
    channelId: 1,
    userId: 1
  });

  const data = await stopPromise;
  expect(data.userId).toBe(1);
});
```

---

## Part 5: Testing DM Flows

```js
describe("Direct Messages", () => {
  it("should create a conversation between two users", async () => {
    const res = await request.post("/api/dm/conversation")
      .set("Authorization", `Bearer ${token}`)
      .send({ otherUserId: user2.id });

    expect(res.status).toBe(201);
    expect(res.body.user1_id).toBeDefined();
    expect(res.body.user2_id).toBeDefined();
    conversationId = res.body.id;
  });

  it("should return existing conversation (idempotent)", async () => {
    const res = await request.post("/api/dm/conversation")
      .set("Authorization", `Bearer ${token}`)
      .send({ otherUserId: user2.id });

    expect(res.status).toBe(200); // 200 not 201
    expect(res.body.id).toBe(conversationId); // same conversation
  });

  it("should send and receive DMs via socket", async () => {
    clientSocket1.emit("join_dm", conversationId);
    clientSocket2.emit("join_dm", conversationId);

    const dmPromise = waitForEvent(clientSocket2, "new_dm");

    clientSocket1.emit("send_dm", {
      conversationId,
      userId: user1.id,
      content: "Hey, private message!"
    });

    const dm = await dmPromise;
    expect(dm.content).toBe("Hey, private message!");
  });
});
```

---

## Part 6: Testing Auth Flows

```js
describe("Auth", () => {
  it("should signup and return token", async () => {
    const res = await request.post("/api/auth/signup")
      .send({ username: "testuser", password: "testpass" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("testuser");
  });

  it("should login with correct credentials", async () => {
    const res = await request.post("/api/auth/login")
      .send({ username: "testuser", password: "testpass" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("should reject wrong password", async () => {
    const res = await request.post("/api/auth/login")
      .send({ username: "testuser", password: "wrongpass" });

    expect(res.status).toBe(401);
  });

  it("should protect routes without token", async () => {
    const res = await request.get("/api/channels");
    expect(res.status).toBe(401);
  });
});
```

---

## Test Distribution Summary

| Suite | Tests | What's Covered |
|-------|-------|----------------|
| Socket | 24 | Message broadcast, room isolation, typing, presence, multi-tab |
| DM | 14 | Conversation create, idempotency, DM send/receive, DM history |
| Auth | 11 | Signup, login, guest, validation, token verification |
| Channel | 7 | CRUD, duplicate names, auth required |
| Message | 6 | Send, fetch history, empty channel, auth |
| User | 6 | Profile, list users, online status |

---

## Exercises

1. **Test reconnection:** Disconnect a socket, reconnect it, and verify it can still receive messages after rejoining a channel.
2. **Test concurrent messages:** Have 10 clients send messages simultaneously to the same channel. Verify all messages arrive and are in order.
3. **Add test coverage reporting:** Run `jest --coverage` and identify which lines/branches aren't tested yet.

## Key Takeaways
- `waitForEvent()` helper converts socket callbacks to Promises for clean async tests
- Always set up the listener BEFORE emitting the event that triggers it
- Test negative cases: events that should NOT arrive (wrong room, unauthorized)
- Socket tests need real server + multiple client connections
- Clean up everything in afterAll: disconnect sockets, close server
- 68 tests across 6 suites gives confidence to refactor without breaking features
