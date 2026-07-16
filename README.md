# Nova CRM - Full-Stack CRM Web Application

A production-ready CRM web application with a modern SaaS-style UI, built with **React**, **Vite**, **Node.js**, **Express**, **PostgreSQL**, **Prisma**, and **JWT Authentication**.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite, TypeScript, React Router, Redux Toolkit, React Query, React Hook Form, Axios, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma ORM, JWT, bcrypt |
| Database | PostgreSQL |

## Project Structure

```
CRM Project/
├── backend/                 # Express API server
│   ├── prisma/              # Schema, migrations, seed
│   └── src/                 # MVC architecture
├── web/                     # React web application (primary frontend)
│   └── src/
│       ├── api/             # Axios client & API calls
│       ├── components/      # Layout, tasks, UI components
│       ├── hooks/           # React Query hooks
│       ├── pages/           # Login, Dashboard, Tasks, etc.
│       ├── store/           # Redux store
│       └── styles/          # Global CSS design system
└── mobile/                  # Legacy Expo app (optional)
```

## Features

- **JWT Authentication** with secure localStorage token storage
- **Role-Based Access Control** — Admin, Sales Team, HR Team
- **Task Management** — Full CRUD, assign, search, filter, sort, pagination
- **Progress Analytics** — Charts, team performance, department metrics
- **Settings** — Profile, theme, notifications, password change
- **Admin Panel** — User management, role management, departments
- **Modern SaaS UI** — Dark theme, glassmorphism, gradients, responsive layout

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```bash
createdb crm_db
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL

npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API runs at `http://localhost:3001`

### 3. Web Frontend

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

The Vite dev server proxies `/api` requests to the backend automatically.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@crm.com | password123 |
| Sales | sales@crm.com | password123 |
| HR | hr@crm.com | password123 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get profile |
| GET | `/api/tasks` | List tasks (filters, pagination) |
| POST | `/api/tasks` | Create task (Admin) |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task (Admin) |
| GET | `/api/progress/analytics` | Analytics dashboard |
| GET | `/api/users` | List users |
| PUT | `/api/users/profile` | Update profile |

## Role Permissions

| Feature | Admin | Sales | HR |
|---------|-------|-------|-----|
| View all tasks | Yes | Assigned only | HR dept only |
| Create/Delete tasks | Yes | No | No |
| Assign tasks | Yes | No | No |
| Update task status | Yes | Yes | Yes |
| User management | Yes | No | No |
| Analytics | All | Own tasks | HR tasks |

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## License

MIT
