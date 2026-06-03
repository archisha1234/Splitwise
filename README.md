# Splitwise Clone

## Live App

- Deployed URL: `TODO`

## Setup

1. Create a PostgreSQL database on Supabase.
2. Run the SQL in `supabase/migrations/001_init.sql`.
3. Set these environment variables:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (optional, for full invite links)
4. Install dependencies and run the app:
   - `npm install`
   - `npm run dev`

## AI Used

- Built with OpenAI Codex.
- `AI_CONTEXT.md` is the source of truth for the product scope and implementation decisions.

## Key Prompts

- The key prompts used during the build are included with the submission package.

## Notes

- Authentication is email/password with hashed passwords and session cookies.
- Balance updates subscribe to Supabase Realtime table changes and refresh the UI automatically.
