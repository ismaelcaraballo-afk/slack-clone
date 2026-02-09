const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgres://localhost:5432/slack_clone";

const channelRoutes = require("../routes/channels");

const app = express();
app.use(express.json());
app.use("/api/channels", channelRoutes);

// Generate a valid test token
const testToken = jwt.sign(
  { id: 1, username: "testuser" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

describe("Channels API", () => {
  describe("GET /api/channels", () => {
    it("should return channels when authenticated", async () => {
      const res = await request(app)
        .get("/api/channels")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const names = res.body.map((c) => c.name);
      expect(names).toContain("general");
      expect(names).toContain("random");
    });

    it("should reject unauthenticated requests", async () => {
      const res = await request(app).get("/api/channels");

      expect(res.status).toBe(401);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .get("/api/channels")
        .set("Authorization", "Bearer garbage-token");

      expect(res.status).toBe(401);
    });
  });
});
