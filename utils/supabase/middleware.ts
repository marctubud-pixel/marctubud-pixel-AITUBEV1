import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. 创建初始响应
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. 初始化 Supabase 客户端
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // 🛠️ 关键修复：在这里加上 : any 类型注解
        setAll(cookiesToSet: any) {
          // 🛠️ 关键修复：在这里也加上 : any
          cookiesToSet.forEach(({ name, value, options }: any) =>
            request.cookies.set(name, value)
          )
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          // 🛠️ 关键修复：还有这里
          cookiesToSet.forEach(({ name, value, options }: any) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. 刷新 User Session
  await supabase.auth.getUser()

  return response
}