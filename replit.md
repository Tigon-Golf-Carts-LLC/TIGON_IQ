# Overview

TIGON IQ is a comprehensive customer service chatbot system designed to provide real-time customer support through embeddable chat widgets. The application enables businesses to deploy AI-powered chatbots on their websites while providing human representatives with the ability to take over conversations when needed. The system includes an admin dashboard for configuration, multi-channel integrations (email, Slack, Trello), and comprehensive analytics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Radix UI primitives with shadcn/ui component system for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming and dark mode support
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Context-based auth provider with protected routes

## UI/UX Features
- **Sticky Navigation**: Navbar stays fixed at top of screen across all pages when scrolling
  - Implementation: `sticky top-0 z-50` on navbar component
  - Parent containers use flexible layout without `overflow-hidden` to enable sticky positioning
  - Scrolling managed by `<main>` elements with `overflow-y-auto`
- **Custom Scrollbars**: Always-visible scrollbars with light/dark mode support
  - Applied to: conversations list, messages area, and long individual messages
  - Width: 12px with custom track/thumb colors
- **Sticky Chat Header**: Fixed conversation controls remain accessible while scrolling through message history
- **Representative Assignment**: Dropdown with real-time filtering showing only online representatives with green dot indicators
- **Domain Badge**: Prominent badge in conversation header showing website domain with Globe icon for easy identification of conversation source

## Admin Features
- **Delete All Messages**: Admin-only feature to bulk delete all messages from all conversations
  - Location: Full-width red button in Conversations page header
  - Access: Only visible and accessible to users with role === 'admin'
  - Behavior: Deletes all messages while preserving conversations
  - Safety: Confirmation dialog with destructive warning before deletion
  - Feedback: Success toast shows count of deleted messages
  - API: DELETE /api/conversations/messages/all (admin-only endpoint)
  - Test ID: `button-delete-all-messages`

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Real-time Communication**: WebSocket server using 'ws' library for live chat functionality
- **Session Management**: Express sessions with PostgreSQL session store
- **Authentication**: Passport.js with local strategy using scrypt for password hashing

## Database Layer
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with schema-first approach
- **Schema Management**: Drizzle Kit for migrations and schema push operations
- **Connection**: Connection pooling with @neondatabase/serverless

## Core Data Models
- **Users**: Representatives and admins with role-based access and online status tracking
- **Websites**: Domain configuration with page allowlists/blocklists and whitelist mode
- **Conversations**: Chat sessions with AI assistance flags and representative assignment
- **Messages**: Chat messages with sender type tracking (customer/representative/AI)
- **Settings**: Global configuration for AI, email, and integration settings

## AI Integration
- **Provider**: OpenAI API integration using gpt-4o-mini model
- **API Key**: OPENAI_API_TIGON_IQ_KEY environment variable
- **Features**: Automated response generation with TIGON-specific product knowledge, handoff decision making, and customer intent extraction
- **Configuration**: Custom TIGON instructions stored in database, temperature (0.7), and max tokens (2000)

## Real-time Features
- **WebSocket Management**: Per-conversation client tracking with authentication
- **Message Types**: Support for text, file, voice, and image messages
- **Typing Indicators**: Real-time typing status between participants
- **Connection State**: Automatic reconnection and heartbeat monitoring
- **Auto-Scroll**: Messages automatically scroll into view when conversations are selected or new messages arrive
- **Message Validation**: All WebSocket messages validated using Zod schemas before processing
  - `send_message`: Only requires `{type, content}` - server derives conversationId/sender from connection state
  - `join_conversation`: Requires `{type, conversationId}` with optional userId
  - Extra fields in messages cause validation failures and 400 errors

## Embeddable Widget
- **Deployment**: Standalone JavaScript widget hosted at https://tigoniq.com/chatbot.js
- **Installation**: Add `<script src="https://tigoniq.com/chatbot.js"></script>` before closing `</body>` tag
- **Customization**: Configurable colors, positioning, and welcome messages
- **Responsive Design**: Mobile and desktop optimized with smooth animations
- **API Communication**: Direct integration with main application backend via https://tigoniq.com
- **Domain Detection**: Automatically detects website domain and loads appropriate configuration from database

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Session Storage**: PostgreSQL-backed session management via connect-pg-simple

## AI Services
- **OpenAI**: gpt-4o-mini integration for automated customer service responses and conversation analysis

## Email Services
- **Email Service**: Transactional email delivery for conversation notifications and summaries

## Frontend Libraries
- **UI Framework**: Extensive Radix UI component suite for accessible, unstyled primitives
- **Styling**: Tailwind CSS with class-variance-authority for component variants
- **Icons**: Lucide React icon library
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Date Handling**: date-fns for date manipulation and formatting

## Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Code Quality**: TSX for TypeScript execution and hot reloading
- **Replit Integration**: Custom Vite plugins for Replit-specific development features

## Planned Integrations
- **Slack**: Webhook-based message routing to Slack channels
- **Trello**: Conversation tracking via Trello card creation and updates
- **Voice Processing**: Voice-to-text capabilities for audio messages

# Production-Development Database Sync

## Overview
The system includes a production-to-development database synchronization feature that allows automatic syncing of all data from the production database (tigoniq.com) to the development database. This ensures development environment stays in sync with production data for testing and debugging.

## Architecture
- **Production Database**: Hosted at tigoniq.com with separate PostgreSQL instance
- **Development Database**: Local Neon PostgreSQL database
- **Sync Direction**: One-way sync from production → development (read-only on production)

## Implementation Details

### API Endpoints
1. **Export Endpoint** (`GET /api/sync/export`)
   - Deployed on production (tigoniq.com)
   - Requires Bearer token authentication via `SYNC_SECRET_KEY` environment variable
   - Returns complete database snapshot: users, websites, conversations, messages, settings, integration logs

2. **Trigger Endpoint** (`POST /api/sync/trigger`)
   - Available on development environment
   - Requires authentication (admin/representative login)
   - Fetches data from production and updates local database
   - Returns sync statistics and success/failure status

### Sync Service (`server/services/production-sync.ts`)
- **Upsert Logic**: Updates existing records, inserts new ones
- **Foreign Key Handling**: Syncs tables in correct order (users → websites → conversations → messages → settings → logs)
- **Error Handling**: Continues syncing even if individual records fail, logs errors to console
- **Production URL**: Configurable via `PRODUCTION_URL` environment variable (defaults to https://tigoniq.com)

### UI Integration
- **Location**: Admin Dashboard → Settings → Data tab
- **Button**: "Sync from Production" with loading states
- **Feedback**: Toast notifications with sync statistics
- **Auto-refresh**: Invalidates all React Query caches after successful sync

## Environment Variables
- `PRODUCTION_URL`: Production server URL (default: https://tigoniq.com)
- `SYNC_SECRET_KEY`: Bearer token for authenticating sync requests (default: "development")

## Usage
1. Navigate to Settings → Data tab in admin dashboard
2. Click "Sync from Production" button
3. Wait for sync to complete (shows stats: X users, Y websites, Z conversations synced)
4. UI automatically refreshes with synced data

## Security Considerations
- Sync export endpoint protected by Bearer token authentication
- Only authenticated admin/representative users can trigger sync
- Passwords are synced as-is (hashed) from production
- Sensitive data (API keys, secrets) included in settings sync

# Avatar Upload System

## Overview
The system provides comprehensive avatar/icon customization for both the chatbot widget and user representatives. Administrators can upload custom branding images that appear throughout the platform and on customer-facing chat widgets.

## Implementation Details

### ImageUpload Component (`client/src/components/image-upload.tsx`)
- **Reusable Component**: Handles all avatar/icon uploads with consistent UX
- **File Support**: PNG, JPG, GIF formats up to 10MB file size
- **Base64 Storage**: Converts uploaded images to base64 data URLs for database storage
- **Preview System**: Real-time preview using shadcn/ui Avatar component
- **Validation**: Client-side file type and size validation with toast notifications
- **Controlled Updates**: useEffect syncs preview with prop changes for async data loading

### Chatbot Widget Icon
- **Location**: Widget Settings page → Widget Appearance section
- **Storage**: `settings.widgetConfig.avatarUrl` (JSON field)
- **API**: Updates via widget settings endpoint
- **Display**: Shows in chatbot widget bubble on customer-facing websites
- **Fallback**: TIGON default icon if no custom icon uploaded
- **Test ID**: `chatbot-avatar-upload` (button), `chatbot-avatar-input` (file input)

### Representative Profile Avatars
- **Location**: Settings page → Profile tab
- **Storage**: `users.profileImageUrl` (varchar column)
- **API**: PATCH `/api/users/:id` with Zod validation
- **Display**: Shows on Representatives page and throughout admin dashboard
- **Fallback**: TIGON default avatar if no custom avatar uploaded
- **Test ID**: `profile-avatar-upload` (button), `profile-avatar-input` (file input)

### API Endpoints
1. **PATCH `/api/users/:id`** - Updates user profile with avatar
   - Validation: Zod schema restricts to whitelisted fields (username, email, name, status, profileImageUrl)
   - Authorization: Requires authentication
   - Response: Returns updated user object without password field
   - Cache: Invalidates `/api/user` query to refresh auth state

2. **GET `/api/user`** - Returns authenticated user with profileImageUrl
   - Used by Settings page to display current avatar

3. **GET `/api/representatives`** - Returns all representatives with profileImageUrl
   - Used by Representatives page to display avatars in team list

### Data Schema
```typescript
// Widget icon
settings.widgetConfig = {
  avatarUrl: string // base64 data URL or empty
  // ... other config
}

// Representative avatar
users.profileImageUrl = varchar // base64 data URL or null
```

### Widget Integration
- **chatbot.js**: Dynamically loads uploaded icon from widgetConfig.avatarUrl
- **Caching**: Widget fetches latest config on each page load
- **WordPress Compatible**: Works with WP Rocket and Cloudflare optimization

## Usage

### Upload Chatbot Icon
1. Navigate to Widget Settings page
2. Scroll to Widget Appearance section
3. Click upload button or click existing avatar
4. Select image file (PNG/JPG/GIF, max 10MB)
5. Image immediately uploads and displays preview
6. Icon appears on customer-facing chat widget

### Upload Representative Avatar
1. Navigate to Settings page
2. Select Profile tab
3. Click upload button or click existing avatar
4. Select image file (PNG/JPG/GIF, max 10MB)
5. Image immediately uploads and displays preview
6. Avatar appears on Representatives page and throughout dashboard

### Remove Uploaded Image
1. Click the "Remove" button below preview
2. Reverts to default TIGON icon/avatar
3. Update persists to database immediately

## Technical Notes
- **Storage Format**: Base64 data URLs stored directly in database (no separate file storage)
- **Size Limit**: 10MB client-side validation prevents oversized uploads
- **Browser Support**: Works in all modern browsers with FileReader API
- **Performance**: Base64 encoding happens client-side, minimal server processing
- **Security**: Zod validation ensures only image data URLs accepted for profileImageUrl field