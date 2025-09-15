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
- **Provider**: OpenAI API integration using GPT-5 model
- **Features**: Automated response generation, handoff decision making, and customer intent extraction
- **Configuration**: Customizable system prompts, temperature, and token limits

## Real-time Features
- **WebSocket Management**: Per-conversation client tracking with authentication
- **Message Types**: Support for text, file, voice, and image messages
- **Typing Indicators**: Real-time typing status between participants
- **Connection State**: Automatic reconnection and heartbeat monitoring

## Embeddable Widget
- **Deployment**: Standalone JavaScript widget for easy website integration
- **Customization**: Configurable colors, positioning, and welcome messages
- **Responsive Design**: Mobile and desktop optimized with smooth animations
- **API Communication**: Direct integration with main application backend

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Session Storage**: PostgreSQL-backed session management via connect-pg-simple

## AI Services
- **OpenAI**: GPT-5 integration for automated customer service responses and conversation analysis

## Email Services
- **SendGrid**: Transactional email delivery for conversation notifications and summaries

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