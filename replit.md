# CodeQuest - Gamified Programming Learning Platform

## Overview

CodeQuest is a gamified programming learning platform that teaches JavaScript through an interactive, game-like experience. The application presents programming concepts through a visual roadmap with lessons and challenges, using a pixel art aesthetic similar to Stardew Valley. Users progress through JavaScript fundamentals by completing lessons and defeating "boss" challenges along a learning path.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based architecture using functional components and hooks
- **Vite Build System**: Fast development server and optimized production builds
- **Wouter Router**: Lightweight client-side routing for navigation between pages
- **TanStack Query**: State management and data fetching with caching capabilities

### UI Framework
- **shadcn/ui Components**: Comprehensive component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom pixel art theme
- **CSS Variables**: Dynamic theming system supporting dark/light modes
- **Pixel Art Design**: Custom fonts (Press Start 2P) and retro gaming aesthetics

### State Management
- **React Hooks**: useState and useEffect for local component state
- **Context API**: Global state management through React Context
- **TanStack Query**: Server state caching and synchronization
- **Local Storage**: Persistence of user progress and preferences

### Backend Architecture
- **Express.js Server**: RESTful API server with middleware support
- **TypeScript**: Type-safe server development
- **Modular Route System**: Organized API endpoints with separation of concerns
- **Development/Production Configuration**: Environment-specific optimizations

### Data Storage
- **PostgreSQL Database**: Primary data storage using Drizzle ORM
- **Neon Database**: Cloud-hosted PostgreSQL for scalability
- **Memory Storage Fallback**: In-memory storage implementation for development
- **Database Migrations**: Version-controlled schema management with Drizzle Kit

### Database Schema
- **Users Table**: User authentication and profile management
- **Lesson Progress**: Track completion status and user advancement
- **Content Management**: Structured lesson data with types (lesson/boss)

### Authentication & Authorization
- **Session-based Authentication**: Secure user session management
- **Password Security**: Encrypted password storage
- **User Registration/Login**: Complete authentication flow

### Development Tools
- **Hot Module Replacement**: Real-time development updates via Vite
- **TypeScript Compilation**: Static type checking and IntelliSense
- **Path Aliases**: Clean import statements with @ prefixes
- **ESLint/Prettier**: Code quality and formatting standards

### Content Architecture
- **Lesson System**: Structured learning content with progressive difficulty
- **Boss Challenges**: Interactive coding challenges with real-time feedback
- **Modal-based Learning**: Focused lesson presentation without page navigation
- **Keyboard Navigation**: Accessibility-first interaction design

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with concurrent features
- **Express.js**: Backend web application framework
- **TypeScript**: Static type checking for JavaScript
- **Vite**: Next-generation frontend build tool

### Database & ORM
- **Drizzle ORM**: Type-safe database toolkit
- **@neondatabase/serverless**: Neon PostgreSQL driver
- **drizzle-zod**: Schema validation integration

### UI Component Libraries
- **@radix-ui/***: Accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility

### State Management & Data Fetching
- **@tanstack/react-query**: Server state management
- **React Hook Form**: Form state management
- **@hookform/resolvers**: Form validation resolvers

### Development & Build Tools
- **Replit Plugins**: Development environment integration
- **PostCSS**: CSS processing and optimization
- **ESBuild**: Fast JavaScript bundler

### Styling & Theming
- **Google Fonts**: Custom typography (Press Start 2P for pixel art theme)
- **Lucide React**: Icon library for UI elements
- **CSS Custom Properties**: Dynamic theming support

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **zod**: Runtime type validation
- **nanoid**: Unique ID generation
- **wouter**: Lightweight client-side routing