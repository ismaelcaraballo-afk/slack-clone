# Testing Guide

## Manual Testing Checklist

### Auth
- [ ] Sign up with new username
- [ ] Log in with existing credentials
- [ ] Reject invalid credentials
- [ ] JWT persists across refresh

### Channels
- [ ] Sidebar shows #general and #random
- [ ] Clicking channel loads its messages
- [ ] Channel switch clears previous messages

### Real-Time
- [ ] Open two browsers, send message in one, appears in other
- [ ] Messages show correct sender and timestamp
- [ ] No duplicate messages

### Persistence
- [ ] Send messages, refresh page, messages still there
- [ ] Log out, log back in, messages still there

## Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```
