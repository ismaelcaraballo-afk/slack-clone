# Lesson 2: Relational Database Design for a Chat App

## What You'll Learn
- Designing tables for users, channels, messages, DMs
- Foreign keys and referential integrity
- One-to-many vs many-to-many relationships
- The "conversation" pattern for DMs
- Indexing for chat query performance
- Schema evolution pitfalls

## Project Context
The Slack Clone needs 5 tables: users, channels, messages (channel messages), conversations (DM sessions), and direct_messages. The relationships between them are the foundation of the entire app.

---

## Part 1: The Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id),
  user2_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Part 2: Relationship Patterns

### One-to-Many: Channel -> Messages
```
channels (1) ---> messages (many)
  id=1 #general     channel_id=1 "Hello"
                     channel_id=1 "Hi there"
                     channel_id=1 "What's up"
```
One channel has many messages. Each message belongs to exactly one channel via `channel_id`.

### Many-to-Many: Users <-> Channels
In Slack, users can be in multiple channels, and channels have multiple users. This typically needs a junction table (`channel_members`). In our MVP, all users see all channels — a simplification. The junction table would look like:
```sql
CREATE TABLE channel_members (
  channel_id INTEGER REFERENCES channels(id),
  user_id INTEGER REFERENCES users(id),
  PRIMARY KEY (channel_id, user_id)
);
```

### The Conversation Pattern for DMs
DMs between two users need a shared "conversation" to group messages:

```
conversations:
  id=1, user1_id=1 (Ismael), user2_id=2 (Manny)

direct_messages:
  conversation_id=1, sender_id=1, "Hey Manny"
  conversation_id=1, sender_id=2, "What's up"
  conversation_id=1, sender_id=1, "Working on the frontend?"
```

**Why not just have sender_id and receiver_id on each message?**
Because then loading a conversation requires: `WHERE (sender=me AND receiver=you) OR (sender=you AND receiver=me)`. With a conversation table, it's just: `WHERE conversation_id = 1`. Much simpler and faster.

**UNIQUE(user1_id, user2_id):** Prevents duplicate conversations between the same two users. But there's a subtle bug — `(1, 2)` and `(2, 1)` are different! The code must always store the smaller ID first: `user1_id = Math.min(a, b), user2_id = Math.max(a, b)`.

---

## Part 3: ON DELETE CASCADE

```sql
messages: channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE
```

If you delete a channel, all its messages are automatically deleted. Without `CASCADE`, PostgreSQL would reject the delete because messages still reference the channel.

Options:
- `CASCADE` — delete children automatically (used here)
- `SET NULL` — set the foreign key to NULL
- `RESTRICT` — block the delete (default)

---

## Part 4: Indexes for Chat Performance

```sql
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_dm_conversation ON direct_messages(conversation_id);
```

**Why these indexes matter for chat:**
- Loading messages for #general: `WHERE channel_id = 1 ORDER BY created_at` — needs both indexes
- Loading a DM thread: `WHERE conversation_id = 5 ORDER BY created_at`
- Without indexes, every message load scans the entire messages table

---

## Part 5: Querying with JOINs

### Get messages with usernames
```sql
SELECT m.*, u.username
FROM messages m
JOIN users u ON m.user_id = u.id
WHERE m.channel_id = $1
ORDER BY m.created_at ASC
LIMIT 50;
```

Without the JOIN, you'd get `user_id: 3` and need a second query to get the username. The JOIN gives you everything in one query.

### Find or create a DM conversation
```js
async findOrCreate(user1Id, user2Id) {
  // Always store smaller ID first
  const [u1, u2] = user1Id < user2Id
    ? [user1Id, user2Id]
    : [user2Id, user1Id];

  // Try to find existing
  let result = await pool.query(
    "SELECT * FROM conversations WHERE user1_id = $1 AND user2_id = $2",
    [u1, u2]
  );

  if (result.rows[0]) return result.rows[0];

  // Create new
  result = await pool.query(
    "INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING *",
    [u1, u2]
  );
  return result.rows[0];
}
```

**Idempotent operation:** Call it 100 times with the same two users, you always get the same conversation. The first call creates it; subsequent calls find the existing one.

---

## Part 6: Schema Evolution Pitfall

In this project, the schema was split between two files:
- `config/schema.sql` — defined users, channels, messages
- `seed.js` — also created conversations and direct_messages tables

**The lesson:** Keep ALL table definitions in ONE authoritative file (schema.sql or a migrations folder). When tables are created in seed scripts, you can lose them if you reset the database without re-seeding. A future team member running `psql -f schema.sql` would get a broken database.

---

## Exercises

1. **Add a `channel_members` table**: Design the junction table, write queries to join/leave channels, and modify the messages query to only show channels the user has joined.
2. **Add message reactions**: Design a `reactions` table (user_id, message_id, emoji). Users can react with multiple different emojis but only once per emoji per message.
3. **Add message threading**: Add a `parent_id` column to messages that references another message. Write a query to get a message and all its replies.

## Key Takeaways
- Foreign keys enforce data integrity at the database level
- The "conversation" pattern is cleaner than sender/receiver pairs for DMs
- Always normalize ID ordering for unique pairs: `min(a,b), max(a,b)`
- `ON DELETE CASCADE` auto-cleans children when a parent is deleted
- Index columns you query by frequently (channel_id, conversation_id, created_at)
- Keep schema definitions in one authoritative place
