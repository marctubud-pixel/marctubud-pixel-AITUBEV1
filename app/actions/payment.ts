'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// 定义充值套餐
export const RECHARGE_PLANS = [
  { id: 'plan_1', name: '尝鲜包', price: 9.9, credits: 100 },
  { id: 'plan_2', name: '标准包', price: 29.9, credits: 350 }, // 赠送一些
  { id: 'plan_3', name: '土豪包', price: 99.9, credits: 1200 }, // 赠送更多
]

// 1. 创建订单 (User Action)
export async function createOrder(planId: string) {
  const supabase = await createClient()
  
  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const plan = RECHARGE_PLANS.find(p => p.id === planId)
  if (!plan) throw new Error("Invalid plan")

  // 写入数据库：待支付订单
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      amount_cny: plan.price,
      credits_value: plan.credits,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Order creation failed:', error)
    throw new Error('订单创建失败')
  }

  return { success: true, orderId: order.id }
}

// 2. 模拟支付成功回调 (Simulated System Action)
// 在真实场景中，这会是一个 Webhook API Route，这里我们用 Server Action 模拟
export async function mockPaymentSuccess(orderId: string) {
  const supabase = await createClient() // 注意：这里还是用的用户客户端，真实 webhook 需要用 Service Role
  
  // 为了安全，真实场景下这里应该校验签名。
  // 模拟场景下，我们假设只要调用这个函数，就代表钱到账了。

  // 开启一个 Supabase RPC 或者直接分步操作（为了演示简单，我们用分步，但生产环境建议用 RPC 事务）
  
  // A. 获取订单详情
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
  if (!order || order.status === 'paid') return { success: false, message: '订单无效或已支付' }

  // B. 更新订单状态
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({ 
      status: 'paid', 
      trade_no: `MOCK_${Date.now()}`, // 模拟流水号
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateOrderError) return { success: false, message: '订单更新失败' }

  // C. 给用户加积分 (这里假设你有一个 profiles 表存积分)
  // 生产环境建议用 RPC 函数 increment_credits(user_id, amount) 来保证原子性
  const { error: creditError } = await supabase.rpc('increment_credits', { 
    user_id_input: order.user_id, 
    amount: order.credits_value 
  })

  // 如果 RPC 还没写，暂时用下面的代码替代（不推荐用于高并发）：
  /*
  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', order.user_id).single()
  await supabase.from('profiles').update({ credits: (profile?.credits || 0) + order.credits_value }).eq('id', order.user_id)
  */

  if (creditError) {
      console.error("加分失败", creditError)
      // 真实场景这里需要报错报警人工介入
  }

  revalidatePath('/pricing') // 刷新页面数据
  return { success: true }
}
