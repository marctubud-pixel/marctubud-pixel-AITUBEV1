import { createBrowserClient } from '@supabase/ssr'

// ✅ 必须是 export function，确保外部可以用 { createClient } 导入
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}