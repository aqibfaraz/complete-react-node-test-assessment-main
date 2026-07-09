# Setup Guide

This guide will help you set up the chat application backend.

## Prerequisites

- Node.js 18+ installed
- pnpm (recommended) or npm

## Step 1: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` file with your configuration:
   ```env
   PORT=3001

   # Pusher Configuration (for real-time chat)
   PUSHER_APP_ID=your_pusher_app_id
   PUSHER_KEY=your_pusher_key
   PUSHER_SECRET=your_pusher_secret
   PUSHER_CLUSTER=your_pusher_cluster
   ```

   **Note:** Pusher is optional. If not configured, the app will still work but real-time updates won't be available.

## Step 2: Install Dependencies

```bash
pnpm install
```

Or with npm:
```bash
npm install
```

## Step 3: Start the Server

Start the development server:

```bash
pnpm dev
```

Or with npm:
```bash
npm run dev
```

The server will:
- Start listening on port 3001
- Initialize in-memory message storage
- Serve uploaded images from `/uploads` directory

## Important Notes

- **No Database Required**: This application uses in-memory storage. Messages are stored in memory and will be lost when the server restarts.
- **File Uploads**: Uploaded images are stored in the `uploads/` directory and persist across server restarts.
- **Real-time Updates**: Configure Pusher in your `.env` file to enable real-time chat updates.

## Troubleshooting

### Port Already in Use
- Change the `PORT` in your `.env` file to a different port (e.g., 3002)

### Pusher Not Working
- Verify your Pusher credentials in `.env`
- Check that all Pusher environment variables are set correctly
- The app will continue to work without Pusher, but real-time updates won't be available
