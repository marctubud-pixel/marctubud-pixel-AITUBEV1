import os
import requests
import json
import time

class ZImageProvider:
    """
    CineFlow 的 Z-Image (DashScope) 接入适配器
    
    核心特性：
    1. 强制关闭 prompt_extend 以确保构图指令不被篡改。
    2. 自动追加 'Style Suffix' 以保证胶片/电影质感。
    3. 内置分辨率映射，默认输出 1280*720 (16:9)。
    """
    
    def __init__(self, api_key=None):
        # 优先读取环境变量
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY")
        if not self.api_key:
            raise ValueError("❌ 错误: 未找到 API Key。请设置环境变量 DASHSCOPE_API_KEY")
            
        self.url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
        self.model = "z-image-turbo" # 使用你指定的 Turbo 模型
        
        # === 核心策略 1: 画质保底后缀 ===
        # 这些词来自于你提供的成功案例，确保关掉智能扩写后画质依然在线
        self.style_suffix = (
            ", film grain, analog film texture, soft film lighting, "
            "Kodak Portra 400 style, cinematic grainy texture, "
            "photorealistic details, subtle noise, 8k resolution"
        )

        # === 核心策略 2: 分辨率映射表 ===
        # 根据你的需求，主打 16:9
        self.size_mapping = {
            "16:9": "1280*720",  # 横屏电影感 (默认)
            "9:16": "720*1280",  # 竖屏 (预留)
            "1:1":  "1024*1024"  # 方图 (预留)
        }

    def generate_storyboard(self, prompt, ratio="16:9"):
        """
        生成分镜图
        :param prompt: 剧情描述 (不需要包含画质词，会自动补全)
        :param ratio: 图片比例，默认为 "16:9"
        :return: 图片 URL 或 None
        """
        
        # 1. 自动拼接画质后缀
        full_prompt = f"{prompt}{self.style_suffix}"
        
        # 2. 获取分辨率字符串
        size_str = self.size_mapping.get(ratio, "1280*720")
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "X-DashScope-Async": "enable" # 建议开启异步
        }

        payload = {
            "model": self.model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"text": full_prompt}
                        ]
                    }
                ]
            },
            "parameters": {
                "prompt_extend": False,  # 关键：关闭智能改写，听从我们的构图指令
                "size": size_str,
                "n": 1
            }
        }

        try:
            print(f"🎬 [CineFlow] Z-Image 启动生成...")
            print(f"   - 比例: {ratio} ({size_str})")
            print(f"   - 构图指令: {prompt[:30]}...") # 只打印前30个字
            
            response = requests.post(self.url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

            # 处理返回结果
            if "output" in result and "task_id" in result["output"]:
                task_id = result["output"]["task_id"]
                return self._poll_task_result(task_id)
            elif "output" in result and "results" in result["output"]:
                # 同步返回的情况
                return result["output"]["results"][0]["url"]
            else:
                print(f"❌ 响应格式异常: {result}")
                return None

        except Exception as e:
            print(f"❌ 请求失败: {str(e)}")
            return None

    def _poll_task_result(self, task_id):
        """轮询异步任务结果"""
        task_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        print(f"⏳ 任务处理中 (ID: {task_id[-6:]})...", end="", flush=True)
        
        start_time = time.time()
        while (time.time() - start_time) < 60: # 60秒超时
            try:
                response = requests.get(task_url, headers=headers)
                data = response.json()
                status = data.get("output", {}).get("task_status", "")
                
                if status == "SUCCEEDED":
                    url = data["output"]["results"][0]["url"]
                    print("\n✅ 生成成功!")
                    return url
                elif status in ["FAILED", "CANCELED"]:
                    print(f"\n❌ 任务失败: {data.get('output', {}).get('message')}")
                    return None
                
                print(".", end="", flush=True)
                time.sleep(1) # 等待
            except Exception:
                pass
                
        print("\n❌ 轮询超时")
        return None

# --- 使用示例 ---
if __name__ == "__main__":
    # export DASHSCOPE_API_KEY="你的key"
    provider = ZImageProvider()
    
    # 模拟 CineFlow 传入的纯剧情 Prompt
    story_prompt = "Over-the-shoulder shot, a detective looking at a map on the wall."
    
    # 调用
    img_url = provider.generate_storyboard(story_prompt, ratio="16:9")
    
    if img_url:
        print(f"分镜下载地址: {img_url}")