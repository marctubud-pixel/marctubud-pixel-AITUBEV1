import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // 1. 等待 Cookie Store (Next.js 15 必须加 await)
  const cookieStore = await cookies()

  // 2. 打印调试日志
  const allCookies = cookieStore.getAll()
  console.log(`🍪 [Debug Server] 收到 Cookie 数量: ${allCookies.length}`)
  
  if (allCookies.length > 0) {
    // 打印前两个 Cookie 的名字验证一下
    console.log(`🍪 [Debug Server] Cookie 示例: ${allCookies.slice(0, 2).map(c => c.name).join(', ')}`)
  } else {
    console.error(`❌ [Debug Server] 警告：没有收到任何 Cookie！认证将失败。`)
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // 🛠️ 修复点：加回了 ": any"，防止 TypeScript 报错
        setAll(cookiesToSet: any) {
          try {
            // 这里的参数也要加 ": any"
            cookiesToSet.forEach(({ name, value, options }: any) => {
               // Server Action 中通常不需要实际写入 Cookie，这里留空或者是为了兼容性
            })
          } catch (error) {
            // ignore
          }
        },
      },
    }
  )
}
