'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// 定义充值套餐
const RECHARGE_PLANS = [
  { id: 'plan_1', name: '尝鲜包', price: 9.9, credits: 100 },
  { id: 'plan_2', name: '标准包', price: 29.9, credits: 350 },
  { id: 'plan_3', name: '土豪包', price: 99.9, credits: 1200 },
]

// 1. 创建订单 (强制通过版)
export async function createOrder(planId: string) {
  console.log("🚀 [Debug] 开始执行 createOrder (强制模式), planId:", planId);

  // --- 探针 1: 检查环境变量 ---
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log(`🔍 [Debug] 环境变量检查: URL=${hasUrl}, Key=${hasKey}`);

  if (!hasUrl || !hasKey) {
    console.error("❌ [Fatal] 缺少 Supabase 环境变量！");
    return { success: false, message: '系统配置错误: 缺少数据库连接' };
  }

  try {
    const supabase = await createClient();
    
    // =========================================================
    // 🛑 核心修改区域：绕过身份验证
    // =========================================================
    
    // 1. 注释掉这行会报错的真实检查：
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // 2. 强制指定一个用户 ID (请替换引号里的内容！)
    const user = { id: 'cec386b5-e80a-4105-aa80-d8d5b8b0a9bf' }; 
    const authError = null;
    
    console.log("⚠️ [Warning] 正在使用硬编码的用户 ID:", user.id);
    // =========================================================

    if (!user.id || user.id.includes('请在这里')) {
         return { success: false, message: '请先在代码里填入真实的用户UUID！' };
    }

    // 检查套餐有效性
    const plan = RECHARGE_PLANS.find(p => p.id === planId);
    if (!plan) return { success: false, message: '无效的套餐' };

    // --- 探针 3: 尝试写入数据库 ---
    console.log("📝 [Debug] 正在写入 orders 表...");
    
    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        amount_cny: plan.price,
        credits_value: plan.credits,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ [DB Error] 数据库写入失败:", dbError);
      console.error("💡 提示: 请确保你已经运行了 'DISABLE ROW LEVEL SECURITY' 的 SQL 命令");
      return { success: false, message: `数据库错误: ${dbError.message}` };
    }

    console.log("✅ [Success] 订单创建成功 ID:", order.id);
    return { success: true, orderId: order.id };

  } catch (err: any) {
    console.error("🔥 [Crash] 发生未捕获异常:", err);
    return { success: false, message: `系统崩溃: ${err.message}` };
  }
}

// 2. 模拟支付成功
export async function mockPaymentSuccess(orderId: string) {
  console.log("🚀 [Debug] 开始执行 mockPaymentSuccess, orderId:", orderId);
  try {
    const supabase = await createClient();
    
    // A. 查订单
    const { data: order, error: findError } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (findError || !order) {
      console.error("❌ [Find Error] 找不到订单:", findError);
      return { success: false, message: '订单不存在' };
    }

    // B. 改状态
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'paid', 
        trade_no: `MOCK_${Date.now()}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error("❌ [Update Error] 更新订单状态失败:", updateError);
      return { success: false, message: '状态更新失败' };
    }

    // C. 加分
    const { error: rpcError } = await supabase.rpc('increment_credits', { 
      user_id_input: order.user_id, 
      amount: order.credits_value 
    });

    if (rpcError) {
      console.error("❌ [RPC Error] 加分函数调用失败:", rpcError);
      return { success: false, message: '积分入账失败' };
    }

    revalidatePath('/pricing');
    return { success: true };

  } catch (err: any) {
    console.error("🔥 [Crash] 支付回调崩溃:", err);
    return { success: false, message: `回调崩溃: ${err.message}` };
  }
}
