# Overview

TIGON IQ is a comprehensive customer service chatbot system designed to provide real-time customer support through embeddable chat widgets. It allows businesses to deploy AI-powered chatbots on their websites, with human representatives able to take over conversations. The system includes an admin dashboard for configuration, multi-channel integrations (email, Slack, Trello), and comprehensive analytics. The business vision is to streamline customer support, enhance user experience, and provide actionable insights for businesses.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI**: Radix UI primitives with shadcn/ui for components, styled with Tailwind CSS (including dark mode).
- **State Management**: TanStack React Query.
- **Routing**: Wouter.
- **Authentication**: Context-based provider with protected routes.
- **UI/UX Decisions**: Sticky navigation and chat headers, custom scrollbars, representative assignment with online indicators, and prominent domain badges in conversation view.
- **Admin Features**:
    - **Delete All Conversations**: Admin-only bulk deletion with confirmation and success feedback.
    - **Website Management**: CRUD operations for registered websites, including domain validation, enabling/disabling, and integration with the embeddable chatbot widget configuration.
    - **Avatar Upload System**: Reusable component for uploading and managing chatbot widget icons and representative profile avatars, storing images as Base64 data URLs in the database.

## Backend
- **Runtime**: Node.js with Express.js (TypeScript, ESM modules).
- **Real-time Communication**: WebSocket server using 'ws' for live chat.
- **Session Management**: Express sessions with PostgreSQL store.
- **Authentication**: Passport.js with local strategy and scrypt for password hashing.

## Database
- **Provider**: PostgreSQL via Neon serverless.
- **ORM**: Drizzle ORM with schema-first approach and Drizzle Kit for migrations.
- **Core Data Models**: Users, Websites, Conversations, Messages, Settings.

## AI Integration
- **Provider**: OpenAI API.
- **Models**: Configurable selection including GPT-4o, GPT-4o Mini (default), GPT-4 Turbo, GPT-4, and GPT-3.5 Turbo.
- **Features**: Automated responses, handoff decision making, customer intent extraction, and custom TIGON instructions.

## Real-time Features
- **WebSockets**: Per-conversation client tracking, authenticated.
- **Message Types**: Text, file, voice, image.
- **Indicators**: Typing status and connection state monitoring.
- **Validation**: Zod schemas for all WebSocket messages.

## Embeddable Widget
- **Deployment**: Standalone JavaScript widget (`chatbot.js`) hosted at `https://tigoniq.com/chatbot.js`.
- **Customization**: Configurable colors, positioning, and welcome messages.
- **Responsiveness**: Mobile and desktop optimized.
- **Integration**: Communicates with the main application backend and dynamically loads configuration based on the website domain.

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless.
- **Session Storage**: `connect-pg-simple` for PostgreSQL-backed sessions.

## AI Services
- **OpenAI**: Used for chatbot intelligence and response generation.

## Email Services
- **Transactional Email Service**: For notifications and conversation summaries.

## Frontend Libraries
- **UI Framework**: Radix UI and `shadcn/ui`.
- **Styling**: Tailwind CSS, `class-variance-authority`.
- **Icons**: Lucide React.
- **Forms**: React Hook Form with Zod validation.
- **Date Handling**: `date-fns`.

## Development Tools
- **Build System**: Vite.

## Planned Integrations
- **Slack**: Webhook-based message routing.
- **Trello**: Conversation tracking via Trello card creation.
- **Voice Processing**: Voice-to-text capabilities.