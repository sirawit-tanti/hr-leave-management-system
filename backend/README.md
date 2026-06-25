# HR Leave Management API

Backend API for the HR Leave Management System, built with NestJS, TypeScript, Prisma, PostgreSQL, JWT authentication, and role-based access control.

## Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL / Supabase
- JWT Authentication
- Role-Based Access Control

## Main Features

- JWT login
- Role-based permission: ADMIN, MANAGER, EMPLOYEE
- Employee profile management
- Leave type management
- Leave balance tracking
- Leave request CRUD
- Approval workflow
- Dashboard API
- Calendar API
- Reports API
- Admin user management
- Demo seed data

## Environment Variables

Create `.env` from `.env.example`.

Required environment variables:

- `PORT`
- `FRONTEND_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

Example:

PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="replace-with-a-secure-random-secret"
JWT_EXPIRES_IN="1d"

## Local Setup

Install dependencies:

`npm install`

Run Prisma migration:

`npx prisma migrate dev`

Generate Prisma client:

`npx prisma generate`

Seed demo data:

`npm run seed`

Run development server:

`npm run start:dev`

API base URL:

`http://localhost:4000/api`

## Demo Accounts

Admin:

`admin@example.com / password123`

Manager:

`manager@example.com / password123`

Employee:

`employee@example.com / password123`

## Core API Routes

### Health

- `GET /api/health`
- `GET /api/health/database`

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Employees

- `GET /api/employees`
- `GET /api/employees/me`
- `GET /api/employees/:id`
- `PATCH /api/employees/:id`

### Leave Types

- `GET /api/leave-types`
- `GET /api/leave-types/:id`
- `POST /api/leave-types`
- `PATCH /api/leave-types/:id`
- `DELETE /api/leave-types/:id`

### Leave Balances

- `GET /api/leave-balances/me`
- `GET /api/leave-balances`
- `GET /api/leave-balances/:id`
- `PATCH /api/leave-balances/:id`

### Leave Requests

- `GET /api/leave-requests`
- `POST /api/leave-requests`
- `GET /api/leave-requests/:id`
- `PATCH /api/leave-requests/:id`
- `PATCH /api/leave-requests/:id/cancel`

### Approvals

- `GET /api/approvals/pending`
- `PATCH /api/approvals/:id/approve`
- `PATCH /api/approvals/:id/reject`

### Dashboard

- `GET /api/dashboard`

### Calendar

- `GET /api/calendar/leave-events`

### Reports

- `GET /api/reports/leave-usage`
- `GET /api/reports/leave-balances`
- `GET /api/reports/leave-usage/export`

### Admin

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `PATCH /api/admin/users/:id/reset-password`

## Notes

- `.env` must not be committed.
- `.env.example` should be committed.
- Demo data can be recreated by running `npm run seed`.
- API routes require `Authorization: Bearer <accessToken>` except health and login routes.
