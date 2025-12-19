# Frontend App

This is the frontend application built with:

- **Vite** - Fast build tool and dev server
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Data fetching and state management
- **React Router** - Client-side routing

## Getting Started

### Development

```bash
yarn dev
```

This will start the Vite dev server, typically at `http://localhost:5173`

### Build

```bash
yarn build
```

This will create an optimized production build in the `dist` directory.

### Preview Production Build

```bash
yarn preview
```

## Project Structure

```
apps/frontend/
├── src/
│   ├── pages/          # Page components
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles with Tailwind
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── postcss.config.js   # PostCSS configuration
```

## Features

- ✅ Hot Module Replacement (HMR)
- ✅ TypeScript support with strict mode
- ✅ Tailwind CSS with dark mode support
- ✅ TanStack Query for data fetching
- ✅ React Router for navigation
- ✅ Path aliases (`@/` for `src/`)
- ✅ ESLint configuration

