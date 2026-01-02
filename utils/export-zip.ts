import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// 🟢 新增：景别中英文映射表
const SHOT_TYPE_MAP: Record<string, string> = {
  "EXTREME WIDE SHOT": "大远景",
  "EXTREME_WIDE_SHOT": "大远景",
  "WIDE SHOT": "全景",
  "WIDE_SHOT": "全景",
  "FULL SHOT": "全身",
  "FULL_SHOT": "全身",
  "MID SHOT": "中景",
  "MID_SHOT": "中景",
  "MEDIUM SHOT": "中景",
  "CLOSE-UP": "特写",
  "CLOSE_UP": "特写",
  "EXTREME CLOSE-UP": "大特写",
  "EXTREME_CLOSE_UP": "大特写"
};

// 辅助：获取图片 Blob
const getImageBlob = async (url: string): Promise<Blob | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.blob();
  } catch (error) {
    console.error('Failed to fetch image:', url, error);
    return null;
  }
};

// 🟢 新增：获取安全的中文文件名
const getSafeFileName = (index: number, shotType: string) => {
  const shotNum = String(index + 1).padStart(2, '0');
  const upperType = shotType.toUpperCase().replace(/\(.*\)/, '').trim(); // 去掉括号内容
  
  // 尝试匹配中文，如果匹配不到则使用原英文，并将空格转下划线
  let cnType = SHOT_TYPE_MAP[upperType];
  
  // 模糊匹配兜底
  if (!cnType) {
      if (upperType.includes("WIDE") || upperType.includes("LONG")) cnType = "全景";
      else if (upperType.includes("MID") || upperType.includes("MEDIUM")) cnType = "中景";
      else if (upperType.includes("CLOSE")) cnType = "特写";
      else cnType = upperType.replace(/\s+/g, '_');
  }

  return `${shotNum}_${cnType}.png`;
};

export const exportStoryboardZIP = async (
  projectName: string,
  panels: any[]
) => {
  const zip = new JSZip();
  // 文件名处理：只保留中文、英文、数字
  const safeProjectName = projectName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_').slice(0, 30);
  
  // 1. 创建文件夹结构
  const assetsFolder = zip.folder("assets");
  
  // 2. 准备文本内容
  let scriptContent = `项目名称: ${projectName}\n`;
  scriptContent += `导出时间: ${new Date().toLocaleString()}\n`;
  scriptContent += `分镜总数: ${panels.length}\n`;
  scriptContent += `------------------------------------------------\n\n`;

  // 3. 遍历分镜
  const promises = panels.map(async (panel, index) => {
    const shotNum = String(index + 1).padStart(2, '0');
    
    // --- A. 处理图片 ---
    if (panel.imageUrl && assetsFolder) {
      const blob = await getImageBlob(panel.imageUrl);
      if (blob) {
        // 🟢 修改：使用中文命名逻辑
        const fileName = getSafeFileName(index, panel.shotType);
        assetsFolder.file(fileName, blob);
      }
    }

    // --- B. 追加文本脚本 ---
    scriptContent += `[分镜 #${shotNum}] ${SHOT_TYPE_MAP[panel.shotType.toUpperCase()] || panel.shotType}\n`;
    scriptContent += `画面描述: ${panel.description}\n`;
    scriptContent += `AI提示词: ${panel.prompt}\n`;
    scriptContent += `\n`; // 空行分隔
  });

  await Promise.all(promises);

  // 4. 写入元数据文件
  zip.file("script_breakdown.txt", scriptContent);
  
  // 5. 写入 JSON 数据 (用于未来恢复项目)
  const projectData = {
    meta: {
      name: projectName,
      exportedAt: new Date().toISOString(),
      version: "CineFlow V6.0"
    },
    panels: panels
  };
  zip.file("project_data.json", JSON.stringify(projectData, null, 2));

  // 6. 生成并下载
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${safeProjectName}_素材包.zip`);
};