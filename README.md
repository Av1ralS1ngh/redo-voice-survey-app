# Voice Survey App

A modern voice-powered survey application built with Next.js, Hume AI's EVI (Emotional Voice Interface), and Supabase.

## Features

- 🎙️ **Voice-First Interface**: Natural conversation-based surveys using Hume AI
- 🎨 **Beautiful Animated Orb**: Visual feedback during voice interactions
- 📊 **Real-time Analytics**: Conversation tracking and analysis
- 🗄️ **Database Storage**: Complete conversation logs in Supabase
- 🚀 **Auto-Initiation**: Agent starts speaking immediately upon connection
- 📱 **Responsive Design**: Works on all devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Voice AI**: Hume AI EVI (Emotional Voice Interface)
- **Database**: Supabase (PostgreSQL)
- **3D Graphics**: Three.js with React Three Fiber
- **Deployment**: Vercel

## Prerequisites

1. **Hume AI Account**: Get API keys from [Hume AI](https://hume.ai)
2. **Supabase Project**: Create a project at [Supabase](https://supabase.com)

## Environment Variables

Create a `.env.local` file with:

```bash
# Hume AI Configuration
HUME_API_KEY=your_hume_api_key
HUME_SECRET_KEY=your_hume_secret_key

# Supabase Configuration  
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Setup

Run the SQL scripts in order:

1. `scripts/setup-database.sql` - Create initial tables
2. `scripts/enhanced-database-schema.sql` - Enhanced schema
3. `scripts/setup-conversations-table.sql` - Conversation storage
4. `scripts/complete-migration.sql` - Final migration
5. `scripts/seed-user.ts` - Seed test users

## Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Usage

1. **Start a Survey**: Visit `/s/[user-id]` (e.g., `/s/bc820345`)
2. **Voice Interaction**: Click "Start Survey" to begin voice conversation
3. **Natural Conversation**: Speak naturally with the AI agent
4. **End Session**: Click the red phone button to end

## API Routes

- `POST /api/session/start` - Initialize voice session
- `POST /api/response` - Store conversation messages
- `POST /api/conversation/complete` - Finalize conversation
- `GET /api/users/[uid]` - Get user information
- `GET /api/analytics/[sessionId]` - Get session analytics

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Manual Deployment

```bash
npm install -g vercel
vercel
```

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── s/[uid]/      # Survey pages
│   └── analytics/    # Analytics dashboard
├── components/
│   ├── FuturisticOrb.tsx  # 3D orb (experimental)
│   └── SimpleOrb.tsx      # Main animated orb
├── lib/
│   ├── pure-evi.ts        # Hume EVI integration
│   ├── supabase.ts        # Database client
│   └── conversation-manager.ts  # Conversation logic
└── utils/
    └── getHumeAccessToken.ts    # Authentication
```

## Features in Detail

### Voice Orb States
- **Idle**: Calm indigo glow
- **Connecting**: Pulsing violet
- **Listening**: Reactive green
- **Speaking**: Dynamic amber

### Conversation Flow
1. Auto-greeting with user's name
2. Background/demographic questions (25s)
3. App experience questions (45s) 
4. Final feedback and recommendations (20s)

### Data Storage
- Complete conversation transcripts
- User demographics and feedback
- Session analytics and timing
- Emotional analysis from Hume AI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
# Deployment trigger
