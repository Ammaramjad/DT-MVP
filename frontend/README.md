# AI Digital Twin Platform - Frontend

React + TypeScript frontend application for the AI Digital Twin SaaS Platform, built with Vite.

## Features

- **Authentication**: JWT-based login with token refresh
- **Dashboard**: KPI cards, recent alerts, forecast visualization
- **Forecasts**: Generate and visualize time-series forecasts with confidence intervals
- **Scenarios**: Run what-if simulations with variable adjustments
- **Recommendations**: View and manage AI-generated recommendations
- **Data Health**: Monitor data ingestion status and quality scores
- **Settings**: Manage organizations, projects, and sites (admin only)

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router v7
- Axios for API calls
- Recharts for data visualization
- Tailwind CSS for styling
- Headless UI components
- Heroicons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and set API URL
# VITE_API_URL=http://localhost:8000
```

### Development

```bash
# Start development server
npm run dev

# Server will run on http://localhost:3000
```

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build Docker image
docker build -t dt-frontend .

# Run container
docker run -p 80:80 dt-frontend
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and endpoints
│   ├── components/       # Reusable UI components
│   ├── context/          # React context providers
│   ├── pages/            # Page components
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main app component with routing
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles
├── Dockerfile            # Production Docker image
├── nginx.conf            # Nginx configuration
└── package.json          # Dependencies
```

## Environment Variables

- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

## Default Credentials

For development/testing:
- Email: `admin@example.com`
- Password: `admin123`
