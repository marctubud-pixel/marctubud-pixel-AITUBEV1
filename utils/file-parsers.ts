import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export async function parseFileToText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
    case 'csv':
      return await parseTextFile(file);
    case 'docx':
      return await parseDocxFile(file);
    case 'xlsx':
    case 'xls':
      return await parseExcelFile(file);
    default:
      throw new Error(`不支持的文件格式: .${extension}`);
  }
}

// 解析纯文本
function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// 解析 Word (.docx)
async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value; // The raw text
}

// 解析 Excel (.xlsx) - 智能拼接所有单元格
async function parseExcelFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let fullText = '';

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    json.forEach((row: any) => {
      // 将每一行的数据拼接成文本
      const rowText = row.map((cell: any) => String(cell)).join(' ');
      if (rowText.trim()) fullText += rowText + '\n';
    });
  });
  
  return fullText;
}