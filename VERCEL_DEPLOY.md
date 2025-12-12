# TIGON IQ - Vercel Deployment Guide

This guide will help you deploy the TIGON IQ chatbot application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Neon Database**: Create a PostgreSQL database at [neon.tech](https://neon.tech)
3. **OpenAI API Key**: Get your API key from [platform.openai.com](https://platform.openai.com/api-keys)
4. **GitHub Account**: For connecting your repository to Vercel

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in the required environment variables:

```env
# Database - Get from Neon (https://neon.tech)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Application Settings
NODE_ENV=production
SESSION_SECRET=your-random-secret-key-here

# Optional: Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Push Database Schema

```bash
npm run db:push
```

### 4. Build Locally (Optional - Test First)

```bash
npm run build
```

This will:
- Build the React frontend with Vite
- Bundle the Express server
- Prepare API routes for Vercel

### 5. Deploy to Vercel

#### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

#### Option B: Deploy via GitHub

1. Push your code to GitHub:
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

2. Go to [vercel.com/new](https://vercel.com/new)

3. Import your GitHub repository

4. Configure environment variables in Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add all variables from `.env.example`
   - **Important**: Add these environment variables:
     - `DATABASE_URL` - Your Neon PostgreSQL connection string
     - `OPENAI_API_KEY` - Your OpenAI API key
     - `SESSION_SECRET` - A random secret key
     - `NODE_ENV=production`

5. Deploy!

## Environment Variables in Vercel

Add these in your Vercel project settings:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key for chatbot |
| `SESSION_SECRET` | Yes | Random secret for session management |
| `NODE_ENV` | Yes | Set to `production` |
| `SMTP_HOST` | No | Email server for notifications |
| `SMTP_PORT` | No | Email server port (587) |
| `SMTP_USER` | No | Email username |
| `SMTP_PASSWORD` | No | Email password |
| `EMAIL_FROM` | No | Sender email address |

## Important Notes

### WebSocket Limitations

Vercel's serverless functions don't support WebSocket connections. This app includes a **polling fallback** that automatically works in serverless environments:

- **REST API endpoints**: All chatbot functionality works via HTTP polling
- **Polling endpoints**:
  - `GET /api/polling/messages/:conversationId` - Long-polling for new messages
  - `POST /api/polling/send/:conversationId` - Send messages
  - `GET /api/polling/status` - Health check

The chatbot widget (`client/public/chatbot.js`) can be updated to use polling instead of WebSockets.

### Database Setup

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Add it to Vercel environment variables
4. Run migrations: `npm run db:push`

### First Time Setup

After deploying, you'll need to:

1. Visit `https://your-app.vercel.app` to access the dashboard
2. Create an admin account (first user becomes admin)
3. Configure chatbot settings in the dashboard
4. Add your website domain
5. Copy the chatbot embed code

## Chatbot Embedding

After deployment, embed the chatbot on any website:

```html
<!-- Add to your website's HTML -->
<script src="https://your-app.vercel.app/chatbot.js"></script>
```

Or use the React component:

```jsx
import { WidgetEmbed } from '@/components/widget-embed';

<WidgetEmbed domain="yourdomain.com" />
```

## File Structure for Vercel

```
TIGON_IQ/
├── api/
│   └── index.ts          # Vercel serverless function entry point
├── client/               # React frontend
│   ├── public/
│   │   └── chatbot.js   # Embeddable chatbot widget
│   └── src/
├── server/               # Express backend
│   ├── routes.ts        # API routes
│   ├── polling.ts       # Polling fallback for WebSockets
│   └── services/
├── dist/                 # Build output
│   └── public/          # Static frontend files
├── vercel.json          # Vercel configuration
└── package.json
```

## Vercel Configuration

The `vercel.json` file configures:

- **Build command**: `npm run build`
- **Output directory**: `dist/public`
- **API routes**: `/api/*` → serverless function
- **Static files**: All other routes → frontend
- **CORS headers**: Enabled for chatbot embedding

## Build Process

```bash
npm run build
```

This runs:
1. `vite build` - Builds React frontend to `dist/public`
2. `esbuild server/index.ts` - Bundles Express server to `dist/index.js`
3. Vercel automatically deploys static files and API routes

## Troubleshooting

### Build Fails

1. Check all environment variables are set in Vercel
2. Verify `DATABASE_URL` is correct
3. Check build logs in Vercel dashboard

### Database Connection Errors

- Ensure `DATABASE_URL` includes `?sslmode=require`
- Verify Neon database is active and accessible
- Check connection string format

### API Routes Not Working

- Verify `vercel.json` configuration
- Check API routes in Vercel Functions dashboard
- Review function logs for errors

### Chatbot Not Loading

1. Check CORS settings in `vercel.json`
2. Verify website domain is registered in dashboard
3. Check browser console for errors
4. Ensure chatbot.js is accessible at `/chatbot.js`

### Polling Instead of WebSockets

The app automatically falls back to polling in serverless environments. No changes needed!

## Performance Optimization

### Serverless Function Limits

- Max execution time: 30 seconds (can be increased with Pro plan)
- Max request size: 4.5 MB
- Cold starts: ~1-2 seconds on free tier

### Recommendations

1. **Enable caching**: Vercel Edge Network caches static assets
2. **Use Neon serverless**: Perfect for serverless functions
3. **Monitor usage**: Check Vercel Analytics dashboard
4. **Upgrade if needed**: Pro plan for higher limits

## Monitoring

### Vercel Dashboard

- View deployment logs
- Monitor function execution
- Check analytics and performance
- Review error logs

### Database Monitoring

- Use Neon dashboard for query performance
- Monitor connection pool usage
- Check database size and limits

## Support

For issues or questions:

1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. Neon documentation: [neon.tech/docs](https://neon.tech/docs)
3. Review application logs in Vercel dashboard
4. Check GitHub issues

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Configure environment variables
3. ✅ Set up database
4. 📝 Create admin account
5. ⚙️ Configure chatbot settings
6. 🌐 Add website domain
7. 🚀 Embed chatbot code

---

**Happy Deploying! 🚀**
