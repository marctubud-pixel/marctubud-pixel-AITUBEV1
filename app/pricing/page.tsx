'use client'

import { useState } from 'react'
import { createOrder, mockPaymentSuccess } from '@/app/actions/payment'
import { Loader2, CheckCircle, CreditCard, Sparkles } from 'lucide-react'
import { toast, Toaster } from 'sonner' 

// 1. 在这里定义数据，避免跨文件引用导致的构建错误
const RECHARGE_PLANS = [
  { id: 'plan_1', name: '尝鲜包', price: 9.9, credits: 100 },
  { id: 'plan_2', name: '标准包', price: 29.9, credits: 350 },
  { id: 'plan_3', name: '土豪包', price: 99.9, credits: 1200 },
]

export default function PricingPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleBuy = async (plan: typeof RECHARGE_PLANS[0]) => {
    try {
      setLoadingId(plan.id)
      
      // 1. 创建订单
      const res = await createOrder(plan.id)
      if (!res.success) {
        toast.error('订单创建失败')
        console.error(res.message)
        return
      }

      toast.info('正在前往收银台...')
      
      // --- 模拟支付等待特效 ---
      await new Promise(resolve => setTimeout(resolve, 1500))
      // ---------------------

      // 2. 支付成功回调
      const payRes = await mockPaymentSuccess(res.orderId!)
      
      if (payRes.success) {
        toast.success(`充值成功！账户已增加 ${plan.credits} 积分`)
      } else {
        toast.error(payRes.message || '支付验证失败')
      }

    } catch (error: any) {
      console.error(error); // 在浏览器控制台打印详细错误
      toast.error(error.message || '出错了，请检查控制台'); 
    }finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-20 px-4">
      <Toaster position="top-center" richColors />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            升级您的 AI 算力
          </h1>
          <p className="text-gray-500 text-lg">充值积分，解锁 GPT-4 优化与 4K 分镜生成</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {RECHARGE_PLANS.map((plan) => (
            <div 
              key={plan.id} 
              className={`
                relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border transition-all duration-300
                ${plan.id === 'plan_2' 
                  ? 'border-blue-500 shadow-xl scale-105 z-10' 
                  : 'border-gray-200 dark:border-zinc-800 hover:border-blue-300 hover:shadow-lg'}
              `}
            >
              {plan.id === 'plan_2' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold px-4 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 推荐选择
                </div>
              )}
              
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">¥{plan.price}</span>
                <span className="text-gray-400">/次</span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="font-bold text-blue-600 dark:text-blue-400">⚡</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{plan.credits} 积分</p>
                    <p className="text-xs text-gray-500">即时到账</p>
                  </div>
                </div>
                
                <div className="h-px bg-gray-100 dark:bg-zinc-800 my-4" />
                
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 高速生成通道</li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 无水印导出</li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 优先客服支持</li>
                </ul>
              </div>

              <button
                onClick={() => handleBuy(plan)}
                disabled={!!loadingId}
                className={`
                  w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                  ${plan.id === 'plan_2' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90'}
                  ${loadingId ? 'opacity-70 cursor-not-allowed' : ''}
                `}
              >
                {loadingId === plan.id ? (
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
      </div>
    </div>
  )
}
