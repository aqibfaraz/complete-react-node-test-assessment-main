# Test Project

## Repository Layout
- api/ - Express backend (messages, file uploads)
- app/ - React frontend scaffold

## Prerequisites
- Node.js 22+
- pnpm (recommended) or npm

## Quick Start
```bash
# backend
cd api
cp env.example .env
pnpm install
pnpm dev
# backend runs on http://localhost:3001

# frontend
cd ../app
cp env.example .env
pnpm install
pnpm dev
# frontend runs on http://localhost:3000
```

Note: No database setup required. The app uses in-memory storage for messages. Messages are lost on server restart, but uploaded files persist in api/uploads.

## Environment Variables

### Backend (.env in api/)
```env
PORT=3001
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster
PUSHER_CHANNEL=chat-messages
```

### Frontend (.env in app/)
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_PUSHER_KEY=your_pusher_key
REACT_APP_PUSHER_CLUSTER=your_pusher_cluster
REACT_APP_PUSHER_CHANNEL=chat-messages
```

Pusher is optional. If credentials are not set, the app still works without realtime push events.

## Completed Challenges

### 1. Real-time messages with Pusher (backend + frontend)
- Backend now publishes:
  - new-message when a message is created
  - message-deleted when a message is deleted
- Frontend now subscribes to the same Pusher channel/events and updates the UI in real time.

### 2. Message search endpoint + realtime filter (backend + frontend)
- Added backend endpoint:
  - GET /api/messages/search?q=term
  - Case-insensitive
  - Requires non-empty q
  - Returns newest first
  - Max 100 results
- Added frontend search input with 300ms debounce.
- Search UI includes loading and empty states.
- Live feed behavior is preserved:
  - When search is empty, UI shows realtime message feed.
  - When searching, UI shows filtered results.
  - Clearing search returns to the live feed without losing realtime updates.

## Submission Guidelines
After completing your challenges:
1. Update README with completed scope and setup.
2. Push this repository to your GitHub account.
3. Share the repository link by email.

---

## Latest Project Updates (2026-07-09)

This section is added as a final update log and setup reference based on the latest code changes and runtime fixes.

### Code Changes Added

1. Realtime setup hardening in frontend
- File updated: app/src/App.js
- Pusher initialization was updated to force WebSocket transport and avoid problematic fallback transport behavior.
- Added transport options in the Pusher config:
  - enabledTransports: ['ws', 'wss']
  - disabledTransports: ['sockjs']

Why this was added:
- Some browser/runtime environments can throw this error during fallback transport setup:
  - Cannot read properties of undefined (reading 'addListener')
- The transport update prevents that runtime path and stabilizes realtime initialization.

2. Runtime verification after fix
- Frontend build completed successfully using npm run build.
- Frontend development server is reachable on http://localhost:3000.
- Backend health endpoint responds on http://localhost:3001/api/health.

### Correct Commands to Run the Project

Backend:
1. cd api
2. npm install
3. npm run dev

Frontend:
1. cd app
2. npm install
3. npm start

Important note:
- Use npm, not nmp. A typo like nmp start or nmp run will fail with command not found/exit code errors.

### Updated Troubleshooting

1. Frontend error: Cannot read properties of undefined (reading 'addListener')
- Confirm app/src/App.js includes the transport settings listed above.
- Restart frontend after the change:
  - stop current process
  - run npm start again in app/
- Hard refresh browser after restart (Ctrl + F5).

2. Realtime does not update instantly
- Verify matching Pusher values in both api/.env and app/.env:
  - key
  - cluster
  - channel
- If Pusher env values are placeholders, app still works but realtime push updates may be disabled.

3. Messages disappear after restart
- This is expected in current design.
- Message data is stored in memory and resets when backend restarts.
- Uploaded files remain in api/uploads.

### Current Feature Status (Post-Update)

1. Send text messages
2. Send image messages
3. Delete messages
4. Realtime message add/delete events through Pusher (when configured)
5. Search messages/users with debounce
6. Graceful behavior when Pusher credentials are missing or placeholders

