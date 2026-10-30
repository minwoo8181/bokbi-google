---
name: supabase-ssr
description: Official best practices for Supabase SSR with Next.js 15 App Router, Server Actions, cookie management, RLS security, and anti-patterns prevention.
---

# Supabase SSR & Next.js 15 App Router Best Practices

## 1. Authentication & Cookie Handling
- **Package**: Use `@supabase/ssr` (never legacy `@supabase/auth-helpers-nextjs`).
- **Client Factory**:
  - `src/lib/supabase/client.ts`: `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`
  - `src/lib/supabase/server.ts`: `createServerClient` with `cookies()` from `next/headers`.
- **Anti-Pattern Prevention**:
  - NEVER call `supabase.auth.getSession()` in Server Components or Server Actions; always use `supabase.auth.getUser()`.
  - Middleware must refresh sessions using `createServerClient` and properly pass cookies in response headers.

## 2. Server Actions Pattern
- Always mark Server Actions with `'use server'`.
- Validate input schemas using Zod before querying Supabase.
- Use explicit error handling and return `{ success: boolean, data?: any, error?: string }` objects rather than throwing unhandled exceptions to the client.

## 3. Row Level Security (RLS) & Sensitive Data Isolation
- Landlord private data (`secret_dong_ho`, `secret_landlord_phone`) MUST NEVER be returned in public queries.
- Only when `matches.is_selected_by_landlord = true` AND the caller is the assigned `matches.agent_id` can the private fields be revealed.
- Broker listings query must enforce `region_dong = '다산동'` and `is_verified = true`.
