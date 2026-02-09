const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgres://localhost:5432/slack_clone";

const messageRoutes = require("../routes/messages");

const app = express();
app.use(express.json());
app.use("/api/messages", messageRoutes);

const testToken = jwt.sign(
  { id: 1, username: "testuser" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

describe("Messages API", () => {
  describe("GET /api/messages/:channelId", () => {
    it("should return messages for a channel", async () => {
      const res = await request(app)
        .get("/api/messages/1")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return empty array for channel with no messages", async () => {
      const res = await request(app)
        .get("/api/messages/999")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should reject unauthenticated requests", async () => {
      const res = await request(app).get("/api/messages/1");

      expect(res.status).toBe(401);
    });
  });
});
