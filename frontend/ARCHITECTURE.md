# Frontend Architecture

## Overview

This is a React + TypeScript single-page application (SPA) built with Vite for the AI Digital Twin SaaS Platform.

## Technology Stack

- **React 19**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router v7**: Client-side routing
- **Axios**: HTTP client with interceptors
- **Recharts**: Data visualization
- **Tailwind CSS**: Utility-first styling
- **Headless UI**: Accessible component primitives
- **Heroicons**: Icon library

## Architecture Patterns

### 1. Authentication Flow
- JWT-based authentication with access and refresh tokens
- Automatic token refresh via Axios interceptors
- Protected routes based on user roles
- Auth state managed via React Context

### 2. State Management
- React Context API for global auth state
- Local component state with useState
- No Redux (kept simple for MVP)

### 3. API Integration
- Centralized API client in `src/api/client.ts`
- Type-safe API methods
- Automatic error handling and retry logic
- Request/response interceptors for auth

### 4. Component Architecture
- **Pages**: Full-page components with data fetching
- **Components**: Reusable UI components
- **Layout**: Shell with navigation
- **Protected Routes**: Auth guards

### 5. Routing
- Role-based access control
- Route protection with ProtectedRoute wrapper
- Auto-redirect to login if unauthenticated

## Directory Structure

```
src/
├── api/              # API client and endpoints
├── components/       # Reusable UI components
├── context/          # React context providers (Auth)
├── pages/            # Page-level components
├── types/            # TypeScript interfaces
├── utils/            # Utility functions
├── App.tsx           # Main app with routing
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## Key Features

1. **Dashboard**: Overview with KPIs, alerts, and forecast preview
2. **Forecasts**: Generate and visualize ML forecasts
3. **Scenarios**: Run what-if simulations with variable adjustments
4. **Recommendations**: View and manage AI-generated recommendations
5. **Data Health**: Monitor data quality and ingestion
6. **Settings**: Admin interface for org/project/site management

## Security

- JWT tokens stored in localStorage
- Automatic token refresh before expiration
- Role-based access control (RBAC)
- No sensitive data in client-side code
- HTTPS enforced in production

## Performance

- Code splitting via dynamic imports (can be added)
- Lazy loading of routes
- Optimized bundle size with Vite
- Production build with minification and tree-shaking

## Development

```bash
npm run dev     # Start dev server
npm run build   # Build for production
npm run preview # Preview production build
```

## Deployment

Docker container with Nginx serving static files:
- Multi-stage build for optimal size
- Gzip compression enabled
- Cache headers for static assets
- SPA routing support (fallback to index.html)
