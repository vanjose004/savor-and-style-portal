# Savor and Style Catering Services — Business Portal

Business management portal for Savor and Style Catering Services (V&A Estrella
Catering Services). See [SAVOR_AND_STYLE_PORTAL.md](./SAVOR_AND_STYLE_PORTAL.md)
for the full product blueprint.

## Tech Stack

- React + Vite, Tailwind CSS v4
- Supabase (Postgres + Auth + Storage)
- jsPDF / jspdf-autotable for contracts and receipts
- React Router, React Hook Form, date-fns, lucide-react

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase project credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_RESEND_API_KEY=your_resend_api_key
   ```
3. Apply the database migrations in `supabase/migrations/` to your Supabase
   project, in order, via the Supabase SQL editor or the Supabase CLI
   (`supabase db push`). They set up:
   - `20260101000001` — extensions, enums, and all core tables
   - `20260101000002` — auto-numbering, balance recalculation, payment fees,
     and timeline automation triggers
   - `20260101000003` — `admins` table and role-check helper functions
   - `20260101000004` — Row Level Security policies and the staff event view
   - `20260101000005` — SECURITY DEFINER RPCs powering the client portal
   - `20260101000006` — seed data for `menu_master`
   - `20260101000007` — adds `created_at` to `booking_menu_items`
   - `20260101000008` — booking code lookup RPC for the landing page
4. After running the migrations, create your admin login: sign up a user via
   Supabase Auth, then insert a row into `admins` with that user's `id`.
   Do the same in `staff` (with a `role`) for each staff login.
5. Start the dev server:
   ```
   npm run dev
   ```

## Project Structure

```
src/
├── components/   # ui, admin, client, staff components
├── pages/        # admin, client, staff pages
├── lib/          # supabase client, pdf helpers, constants, utils
├── hooks/        # shared hooks
├── context/      # auth context/provider
└── App.jsx       # routes for all three portals
supabase/
└── migrations/   # database schema, RLS, RPCs, seed data
```
