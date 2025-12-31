import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function exportStoryboardZIP(projectTitle: string, panels: any[]) {
  const zip = new JSZip();
  const folder = zip.folder("storyboard_assets");
  
  if (!folder) throw new Error("ZIP creation failed");

  // 1. 生成一份简单的文本清单
  let scriptContent = `Project: ${projectTitle}\n\n`;
  panels.forEach((p, i) => {
    scriptContent += `Shot #${String(i + 1).padStart(2, '0')}\n`;
    scriptContent += `Shot Type: ${p.shotType}\n`;
    scriptContent += `Description: ${p.description}\n`;
    scriptContent += `Prompt: ${p.prompt}\n`;
    scriptContent += `-------------------\n\n`;
  });
  folder.file("script_breakdown.txt", scriptContent);

  // 2. 下载并打包所有图片
  const imagePromises = panels.map(async (panel, index) => {
    if (!panel.imageUrl) return;

    try {
      // Fetch 图片数据
      const response = await fetch(panel.imageUrl);
      const blob = await response.blob();
      
      // 命名规范: 01_close-up_description.png
      // 截取描述的前20个字符作为文件名，去除非法字符
      const safeDesc = panel.description.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${String(index + 1).padStart(2, '0')}_${panel.shotType.replace(/\s+/g, '_')}_${safeDesc}.png`;
      
      folder.file(filename, blob);
    } catch (e) {
      console.warn(`Failed to package image for shot ${index + 1}`, e);
    }
  });

  await Promise.all(imagePromises);

  // 3. 触发下载
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${projectTitle.replace(/\s+/g, '_')}_assets.zip`);
}