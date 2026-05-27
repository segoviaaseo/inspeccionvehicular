# Overview

This is a Vehicle Inspection Management System built with React and Express. The application enables fleet managers to conduct, track, and manage vehicle inspections with comprehensive checklists covering technical, safety, and legal requirements. The system includes vehicle registration, document expiry tracking (SOAT/RTM), and detailed inspection reporting capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Routing**: Wouter for client-side navigation
- **State Management**: React hooks with local state and custom hooks for data management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Data Fetching**: TanStack Query for server state management (configured but not currently used)

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Development**: Development server uses tsx for TypeScript execution
- **Production**: esbuild for bundling server code
- **Middleware**: Custom logging middleware for API requests

## Data Storage Solutions
- **Database**: PostgreSQL configured with Drizzle ORM
- **Connection**: Neon Database serverless connection (@neondatabase/serverless)
- **Schema Management**: Drizzle migrations in `./migrations` directory
- **Current Implementation**: In-memory storage with localStorage for persistence (temporary solution)
- **Data Models**:
  - Users (authentication placeholder)
  - Vehicles (name, license plate, type, document expiry dates)
  - Inspections (date, vehicle, inspector, completion status)
  - Inspection Items (checklist items with pass/fail/not-checked status)

## Authentication and Authorization
- **Current State**: Placeholder user system with basic schema
- **Storage Interface**: Generic storage interface with memory implementation
- **Session Management**: Express session configuration present but not actively used

## Key Features
- **Vehicle Management**: CRUD operations for fleet vehicles with document tracking
- **Inspection System**: Multi-category checklist (technical, safety, legal) with 30+ predefined items
- **Document Alerts**: Automatic notification system for expiring SOAT and RTM documents
- **Mobile Responsive**: Tailwind CSS responsive design with mobile-first approach
- **Real-time Updates**: Local state synchronization with localStorage persistence

# External Dependencies

## Database and ORM
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Neon Database**: Serverless PostgreSQL hosting platform
- **Drizzle Kit**: Database migrations and schema management

## UI and Components
- **Radix UI**: Unstyled, accessible component primitives
- **shadcn/ui**: Pre-built component library with Tailwind CSS
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for UI elements

## Development Tools
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript/TypeScript bundler for production builds
- **Replit Integration**: Development environment integration with runtime error overlay and cartographer

## State Management
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Wouter**: Lightweight client-side routing

## Date and Validation
- **date-fns**: Date manipulation and formatting utilities
- **Zod**: TypeScript-first schema validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation