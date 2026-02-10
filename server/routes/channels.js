const express = require("express");
const Channel = require("../models/Channel");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// GET /api/channels — list all channels
router.get("/", authMiddleware, async (req, res) => {
  try {
    const channels = await Channel.getAll();
    res.json(channels);
  } catch (err) {
    console.error("Get channels error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// POST /api/channels — create a new channel
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Channel name is required" });
    }
    const channel = await Channel.create(name.trim());
    res.status(201).json(channel);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Channel already exists" });
    }
    console.error("Create channel error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
