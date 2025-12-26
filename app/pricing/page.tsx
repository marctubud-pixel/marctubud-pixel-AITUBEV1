'use client'

import { useState } from 'react'
import { RECHARGE_PLANS, createOrder, mockPaymentSuccess } from '@/app/actions/payment'
import { Loader2, CheckCircle, CreditCard } from 'lucide-react'
import { toast } from 'sonner' // 假设你用了 sonner 或其他 toast 库

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null) // 存储正在处理的 planId

  const handleBuy = async (plan: typeof RECHARGE_PLANS[0]) => {
    try {
      setLoading(plan.id)
      
      // 1. 创建订单
      const { success, orderId } = await createOrder(plan.id)
      if (!success) throw new Error('订单创建失败')

      toast.info('正在前往收银台...')

      // 2. 模拟支付过程 (延迟 1.5秒)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 3. 模拟支付成功回调
      const result = await mockPaymentSuccess(orderId)
      
      if (result.success) {
        toast.success(`充值成功！获得 ${plan.credits} 积分`)
      } else {
        toast.error('支付验证失败')
      }

    } catch (error) {
      toast.error('系统繁忙，请稍后再试')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-20 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">充值积分</h1>
        <p className="text-gray-500">支持 AI.Tube 创作，获取更多算力支持</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {RECHARGE_PLANS.map((plan) => (
          <div key={plan.id} className="border border-zinc-200 rounded-xl p-8 hover:shadow-lg transition relative bg-white dark:bg-zinc-900 dark:border-zinc-800">
            {plan.id === 'plan_2' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                最受欢迎
              </span>
            )}
            
            <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-3xl font-bold">¥{plan.price}</span>
            </div>

            <ul className="mb-8 space-y-3">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-bold">{plan.credits} 积分</span>
              </li>
              <li className="flex items-center gap-2 text-gray-500 text-sm">
                <CheckCircle className="w-4 h-4" />
                支持 GPT-4 提词优化
              </li>
              <li className="flex items-center gap-2 text-gray-500 text-sm">
                <CheckCircle className="w-4 h-4" />
                支持分镜图生成
              </li>
            </ul>

            <button
              onClick={() => handleBuy(plan)}
              disabled={!!loading}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition
                ${loading === plan.id 
                  ? 'bg-zinc-100 text-zinc-400' 
                  : 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black'}`}
            >
              {loading === plan.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  立即充值
                </>
              )}
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-center text-xs text-gray-400 mt-12">
        * 本页面为模拟支付环境，不会产生真实扣费。
      </p>
    </div>
  )
}
