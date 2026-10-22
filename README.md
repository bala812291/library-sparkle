# Athenaeum College Library Management System

A modern, full-stack library management system for colleges and universities, designed for cataloging, circulation, student reservations, and inventory control.

## Overview

Athenaeum provides a unified interface for library staff, students, and administrators to streamline academic book management:
- **Circulation Management**: Rapid issue and return workflows with atomic, race-safe database transactions.
- **Catalog & Inventory**: Real-time computed inventory counts across book titles, categories, authors, and publishers.
- **Student Portal**: Book discovery, reservation queue tracking, loan history, and fine status.
- **Admin Dashboard**: Real-time metrics on book circulation, active borrowers, outstanding fines, and category distributions.
- **Role-Based Access Control**: Granular roles (Admin, Librarian, Student) guarded by database Row-Level Security (RLS) policies.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) with React 19
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **State & Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Backend / Database**: Supabase (PostgreSQL with RLS and Security-Definer functions)
- **ORM / Migrations**: Drizzle ORM

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Library
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   DATABASE_URL=postgresql://...
   ```

### Development Server

Run the development server locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the displayed Vite local port) to view the application.

### Available Scripts

- `npm run dev` - Start local development server with HMR
- `npm run build` - Create optimized production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint checks
- `npm run format` - Format source files with Prettier
- `npm run test` - Execute unit tests with Vitest

## Architecture & Security Rules

- **Transactions & RLS**: All circulation operations (issuing, returning, fine payments) execute via security-definer SQL functions to ensure atomic, tamper-proof record keeping.
- **Computed Inventory**: Catalog counts are derived dynamically from active copy statuses via views (`books_catalog`), preventing out-of-sync count columns.
- **Private Storage**: Book cover assets reside in authenticated buckets and are delivered using temporary signed URLs.
