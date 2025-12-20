import { createClient } from '@supabase/supabase-js'

// 👇 使用 || '' 给个空字符串兜底，防止构建时报错
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// 创建客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
