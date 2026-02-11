const http = require("http");
const { Server } = require("socket.io");
const { io: Client } = require("socket.io-client");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgres://localhost:5432/slack_clone";

const chatHandler = require("../sockets/chatHandler");

let httpServer, ioServer, port;

function createClient(user) {
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
  return Client(`http://localhost:${port}`, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true,
  });
}

beforeAll((done) => {
  httpServer = http.createServer();
  ioServer = new Server(httpServer, { transports: ["websocket"] });
  chatHandler(ioServer);
  httpServer.listen(0, () => {
    port = httpServer.address().port;
    done();
  });
});

afterAll((done) => {
  ioServer.close();
  httpServer.close(done);
});

describe("Socket.io", () => {
  let client;

  afterEach(() => {
    if (client) client.disconnect();
  });

  describe("Authentication", () => {
    it("should connect with valid JWT", (done) => {
      client = createClient({ id: 100, username: "socketuser" });
      client.on("connect", () => {
        expect(client.connected).toBe(true);
        done();
      });
    });

    it("should reject connection with no token", (done) => {
      client = Client(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true,
      });
      client.on("connect_error", (err) => {
        expect(err.message).toBe("No token provided");
        done();
      });
    });

    it("should reject connection with invalid token", (done) => {
      client = Client(`http://localhost:${port}`, {
        auth: { token: "garbage.token.here" },
        transports: ["websocket"],
        forceNew: true,
      });
      client.on("connect_error", (err) => {
        expect(err.message).toBe("Invalid token");
        done();
      });
    });
  });

  describe("Channel joining", () => {
    it("should join a channel room", (done) => {
      client = createClient({ id: 101, username: "joiner" });
      client.on("connect", () => {
        client.emit("joinChannel", { channelId: 1 });
        // Give server a moment to process
        setTimeout(() => {
          // If we got here without error, join worked
          expect(client.connected).toBe(true);
          done();
        }, 100);
      });
    });
  });

  describe("Online presence", () => {
    it("should receive onlineUsers on connect", (done) => {
      client = createClient({ id: 102, username: "presenceuser" });
      client.on("onlineUsers", (users) => {
        const found = users.find((u) => u.username === "presenceuser");
        if (found) {
          expect(found.userId).toBe(102);
          done();
        }
      });
    });

    it("should remove user from onlineUsers on disconnect", (done) => {
      const client1 = createClient({ id: 103, username: "leaver" });
      const client2 = createClient({ id: 104, username: "watcher" });

      let client1Connected = false;

      client2.on("onlineUsers", (users) => {
        const hasLeaver = users.find((u) => u.username === "leaver");
        if (client1Connected && !hasLeaver) {
          // leaver disconnected and was removed
          client2.disconnect();
          done();
        }
      });

      client1.on("connect", () => {
        client1Connected = true;
        // Disconnect after a brief delay
        setTimeout(() => {
          client1.disconnect();
        }, 200);
      });

      // Clean up client ref so afterEach doesn't double-disconnect
      client = client2;
    });

    it("should deduplicate users with multiple connections", (done) => {
      const clientA = createClient({ id: 105, username: "multitab" });
      const clientB = createClient({ id: 105, username: "multitab" });

      let bothConnected = false;

      clientA.on("connect", () => {
        if (clientB.connected) bothConnected = true;
      });
      clientB.on("connect", () => {
        if (clientA.connected) bothConnected = true;
      });

      clientB.on("onlineUsers", (users) => {
        if (bothConnected) {
          const count = users.filter((u) => u.username === "multitab").length;
          expect(count).toBe(1);
          clientA.disconnect();
          clientB.disconnect();
          done();
        }
      });

      client = clientA;
    });
  });

  describe("Typing indicators", () => {
    it("should broadcast typing to other users in channel", (done) => {
      const sender = createClient({ id: 106, username: "typer" });
      const receiver = createClient({ id: 107, username: "reader" });

      let bothJoined = 0;

      receiver.on("userTyping", ({ username, channelId }) => {
        expect(username).toBe("typer");
        expect(channelId).toBe(5);
        sender.disconnect();
        receiver.disconnect();
        done();
      });

      const joinAndEmit = () => {
        bothJoined++;
        if (bothJoined === 2) {
          setTimeout(() => {
            sender.emit("typing", { channelId: 5 });
          }, 100);
        }
      };

      sender.on("connect", () => {
        sender.emit("joinChannel", { channelId: 5 });
        setTimeout(joinAndEmit, 50);
      });

      receiver.on("connect", () => {
        receiver.emit("joinChannel", { channelId: 5 });
        setTimeout(joinAndEmit, 50);
      });

      client = sender;
    });

    it("should broadcast stopTyping to other users in channel", (done) => {
      const sender = createClient({ id: 108, username: "stopper" });
      const receiver = createClient({ id: 109, username: "listener" });

      let bothJoined = 0;

      receiver.on("userStopTyping", ({ username, channelId }) => {
        expect(username).toBe("stopper");
        expect(channelId).toBe(6);
        sender.disconnect();
        receiver.disconnect();
        done();
      });

      const joinAndEmit = () => {
        bothJoined++;
        if (bothJoined === 2) {
          setTimeout(() => {
            sender.emit("stopTyping", { channelId: 6 });
          }, 100);
        }
      };

      sender.on("connect", () => {
        sender.emit("joinChannel", { channelId: 6 });
        setTimeout(joinAndEmit, 50);
      });

      receiver.on("connect", () => {
        receiver.emit("joinChannel", { channelId: 6 });
        setTimeout(joinAndEmit, 50);
      });

      client = sender;
    });
  });

  describe("Messaging", () => {
    it("should emit sendMessage to server without error", (done) => {
      // Use a real user ID from the DB (id: 1 = ismael)
      const sender = createClient({ id: 1, username: "ismael" });
      const receiver = createClient({ id: 1, username: "ismael" });

      let bothJoined = 0;

      receiver.on("newMessage", (msg) => {
        expect(msg.content).toBe("hello from socket test");
        expect(msg.username).toBe("ismael");
        expect(msg.channel_id).toBe(1);
        sender.disconnect();
        receiver.disconnect();
        done();
      });

      const joinAndSend = () => {
        bothJoined++;
        if (bothJoined === 2) {
          setTimeout(() => {
            sender.emit("sendMessage", { channelId: 1, content: "hello from socket test" });
          }, 100);
        }
      };

      sender.on("connect", () => {
        sender.emit("joinChannel", { channelId: 1 });
        setTimeout(joinAndSend, 50);
      });

      receiver.on("connect", () => {
        receiver.emit("joinChannel", { channelId: 1 });
        setTimeout(joinAndSend, 50);
      });

      client = sender;
    });

    it("should not send empty messages", (done) => {
      client = createClient({ id: 1, username: "ismael" });

      client.on("connect", () => {
        client.emit("joinChannel", { channelId: 1 });
        setTimeout(() => {
          client.emit("sendMessage", { channelId: 1, content: "   " });
          // No newMessage should fire — wait and confirm
          let received = false;
          client.on("newMessage", () => { received = true; });
          setTimeout(() => {
            expect(received).toBe(false);
            done();
          }, 300);
        }, 100);
      });
    });
  });
});
