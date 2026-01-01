import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

export const exportStoryboardZIP = async (
  projectName: string,
  panels: any[]
) => {
  const zip = new JSZip();
  const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
  
  // 1. 创建文件夹结构
  const assetsFolder = zip.folder("assets");
  
  // 2. 准备文本内容
  let scriptContent = `PROJECT: ${projectName}\n`;
  scriptContent += `EXPORT DATE: ${new Date().toLocaleString()}\n`;
  scriptContent += `TOTAL SHOTS: ${panels.length}\n`;
  scriptContent += `------------------------------------------------\n\n`;

  // 3. 遍历分镜
  const promises = panels.map(async (panel, index) => {
    const shotNum = String(index + 1).padStart(2, '0');
    
    // --- A. 处理图片 ---
    if (panel.imageUrl && assetsFolder) {
      const blob = await getImageBlob(panel.imageUrl);
      if (blob) {
        // 命名格式: 01_MID_SHOT.png
        const safeShotType = panel.shotType.replace(/\s+/g, '_').toUpperCase();
        const fileName = `${shotNum}_${safeShotType}.png`;
        assetsFolder.file(fileName, blob);
      }
    }

    // --- B. 追加文本脚本 ---
    scriptContent += `[SHOT #${shotNum}] ${panel.shotType}\n`;
    scriptContent += `ACTION: ${panel.description}\n`;
    scriptContent += `PROMPT: ${panel.prompt}\n`;
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
      version: "CineFlow V3.1"
    },
    panels: panels
  };
  zip.file("project_data.json", JSON.stringify(projectData, null, 2));

  // 6. 生成并下载
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `CineFlow_Assets_${safeProjectName}_${Date.now()}.zip`);
};