# Care Africa

A comprehensive loyalty and practice management system designed for healthcare practices.

## Overview

Care Africa helps healthcare practices manage their patient relationships, rewards programs, and daily operations through a unified platform. The system includes features for patient management, inventory tracking, appointment scheduling, and loyalty program administration.

## Features

- 🏥 Practice Management
- 💫 Patient Loyalty Programs
- 📊 Inventory Management
- 📅 Appointment Scheduling
- 💰 Sales Tracking
- 🎁 Rewards & Points System
- ⚙️ Customizable Settings

## Tech Stack

- React + TypeScript
- Vite
- Supabase
- TailwindCSS
- Shadcn/ui
- React Query
- React Router
- React Hook Form
- Zod

## Getting Started

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Create a Supabase project, then apply the schema in order (SQL Editor, or `supabase db push`):
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`

   Verify the access rules with `supabase/tests/rls_test.sql`.

3. Configure environment variables:
```bash
cp .env.example .env     # then fill in the values
```

4. Start the development server (http://localhost:8080):
```bash
npm run dev
```

In Supabase, set Authentication > URL Configuration so the site URL and redirect URLs include
`http://localhost:8080`.
