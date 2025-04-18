import { NextRequest, NextResponse } from 'next/server';
import { mkdir, access,stat } from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import {saveSurveyResponseWithPDF} from "@/services/SurveyServices";
// 定義調查數據類型
interface SurveyData {
  [key: string]:
    | string
    | number
    | boolean
    | Array<string | number | boolean | Record<string, unknown>>
    | Record<string, unknown>
    | null
    | undefined;
}

// 創建臨時目錄用於存儲 HTML 和生成的 PDF
async function ensureDirExists(dirPath: string): Promise<void> {
  try {
    // Check if directory exists
    await access(dirPath);
  } catch (error) {
    Error(error as string);
    try {
      await mkdir(dirPath, { recursive: true });
      console.log(`Directory created: ${dirPath}`);
    } catch (mkdirError) {
      console.error(`Error creating directory: ${dirPath}`, mkdirError);
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }
}

// 獲取上傳目錄的絕對路徑
function getUploadPath(): string {
  // 直接從項目根目錄獲取 upload_file/uploads 路徑
  return path.join(process.cwd(), 'upload_file', 'uploads');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log("API route triggered");

  try {
    console.log("Trying to parse formData");
    let formData;

    try {
      formData = await request.formData();
      console.log("FormData parsed successfully");
    } catch (formError) {
      console.error("FormData parsing failed:", formError);
      return NextResponse.json({
        error: '無法解析表單數據',
        details: formError instanceof Error ? formError.message : '未知錯誤'
      }, { status: 400 });
    }

    console.log("FormData keys:", [...formData.keys()]);

    const signature1 = formData.get('signature1') as string | undefined;
    const signature2 = formData.get('signature2') as string | undefined;
    const surveyDataStr = formData.get('surveyData') as string;
    const surveyid = formData.get('surveyUUID') as string;

    console.log("FormData contents:", {
      hasSig1: !!signature1,
      sig1Length: signature1?.length,
      hasSig2: !!signature2,
      sig2Length: signature2?.length,
      hasSurveyData: !!surveyDataStr,
      surveyIdExists: !!surveyid
    });

    if (!surveyDataStr) {
      return NextResponse.json({ error: '缺少調查數據' }, { status: 400 });
    }

    let surveyData: SurveyData;
    try {
      surveyData = JSON.parse(surveyDataStr);
    } catch (error) {
      console.error('解析調查數據失敗:', error);
      return NextResponse.json({ error: '無效的調查數據格式' }, { status: 400 });
    }

    // 生成唯一的文件名
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `survey_${timestamp}_${randomStr}`;

    // 獲取上傳目錄並確保其存在
    const uploadDir = getUploadPath();
    await ensureDirExists(uploadDir);

    // 完整的 PDF 文件路徑
    const pdfPath = path.join(uploadDir, `${filename}.pdf`);
    const htmlContent = generateHTML(surveyData, signature1, signature2);

    console.log(`Generating PDF at: ${pdfPath}`);

    // 使用 Puppeteer 將 HTML 轉換為 PDF
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.NODE_ENV === 'production'
        ? '/usr/bin/google-chrome-stable'  // Docker 環境中 Chrome 的路徑
        : undefined,                        // 開發環境使用 Puppeteer 內建的 Chrome
      args: [
        '--no-sandbox',                    // 在 Docker 中必須
        '--disable-setuid-sandbox',        // 增加安全性
        '--disable-dev-shm-usage',         // 避免 Docker 中的記憶體問題
        '--disable-gpu',                   // 禁用 GPU 加速
        '--disable-software-rasterizer',   // 提高穩定性
        '--font-render-hinting=none'       // 改善字體渲染
      ]
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });

    await browser.close();

    // 返回 PDF 的 URL (需要配置 Next.js 以提供對外部目錄的訪問)
    const fileUrl = `/uploads/${filename}.pdf`;
    // 獲取文件大小
    const fileStats = await stat(pdfPath);
    const fileSize = fileStats.size;
    console.log(`PDF generated successfully: ${pdfPath}`);
    // 保存調查結果和PDF文件信息到數據庫
      try {
        const dbResult = await saveSurveyResponseWithPDF(
          surveyid,
          surveyDataStr,
          {
            fileName: `${filename}.pdf`,
            fileType: 'application/pdf',
            fileUrl: fileUrl,
            fileSize: fileSize
          }
        );

        console.log("Successfully saved to database:", dbResult);

        return NextResponse.json({
          success: true,
          fileUrl,
          message: 'PDF 已成功生成並保存到數據庫',
          responseId: dbResult.response.id,
          fileId: dbResult.file.id
        });

      } catch (dbError) {
        console.error('保存到數據庫失敗:', dbError);

        // 即使數據庫保存失敗，我們仍然返回PDF URL
        return NextResponse.json({
          success: true,
          fileUrl,
          message: 'PDF 已成功生成，但保存到數據庫失敗',
          error: dbError instanceof Error ? dbError.message : '未知數據庫錯誤',
          filePath: pdfPath
        });
      }

    } catch (error) {
      console.error('生成 PDF 時發生錯誤:', error);
      return NextResponse.json({
        error: '生成 PDF 失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      }, { status: 500 });
    }
  }





// 生成 HTML 內容的輔助函數
function generateHTML(surveyData: SurveyData, signature1?: string, signature2?: string): string {
  // HTML生成代碼保持不變...
  // 格式化日期
  const now = new Date();
  const formattedDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

  // 處理化學品詳細資訊
  const renderChemicalInfo = (): string => {
    const chemicalData = surveyData['化學品詳細資訊'];
    if (!chemicalData) return '<p>無化學品資訊</p>';

    // 確保化學品資訊是數組
    const chemicalInfoArray = Array.isArray(chemicalData)
      ? chemicalData as unknown[]
      : [];

    if (chemicalInfoArray.length === 0) return '<p>無化學品資訊</p>';

    return `
      <div class="chemical-info">
        ${chemicalInfoArray.map((chemical, index) => {
          // 確保每個化學品是對象
          if (typeof chemical !== 'object' || chemical === null) {
            return `<div class="chemical-item"><h4>化學品 #${index + 1}</h4><p>資料格式錯誤</p></div>`;
          }
          
          return `
            <div class="chemical-item">
              <h4>化學品 #${index + 1}</h4>
              <table>
                <thead>
                  <tr>
                    <th>項目</th>
                    <th>內容</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(chemical as Record<string, unknown>).map(([key, value]) => `
                    <tr>
                      <td>${key}</td>
                      <td>${Array.isArray(value) 
                        ? value.map(item => `<span class="badge">${String(item)}</span>`).join('') 
                        : String(value)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  // 渲染一般調查結果
  const renderSurveyResults = (): string => {
    return Object.entries(surveyData)
      .filter(([key]) => key !== '化學品詳細資訊') // 排除化學品資訊，因為它會單獨處理
      .map(([key, value]) => {
        // 根據不同的值類型，使用不同的渲染方式
        let valueHtml = '';

        if (typeof value === 'boolean') {
          valueHtml = `<span class="badge ${value ? 'badge-success' : 'badge-error'}">${value ? '是' : '否'}</span>`;
        } else if (Array.isArray(value)) {
          valueHtml = value.map(item => `<span class="badge badge-outline">${String(item)}</span>`).join(' ');
        } else if (typeof value === 'object' && value !== null) {
          valueHtml = `<pre>${JSON.stringify(value, null, 2)}</pre>`;
        } else {
          valueHtml = `<span>${value === null ? '無' : String(value)}</span>`;
        }

        // 對於長標題，使用不同的布局
        const isLongTitle = typeof key === 'string' && key.length > 60;

        if (isLongTitle) {
          return `
            <div class="survey-item long-title">
              <div class="title">${key}:</div>
              <div class="value">${valueHtml}</div>
            </div>
          `;
        } else {
          return `
            <div class="survey-item">
              <span class="title">${key}:</span>
              <span class="value">${valueHtml}</span>
            </div>
          `;
        }
      })
      .join('');
  };

  // 完整的 HTML 模板
  return `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>化學品安全督導報告</title>
      <style>
        body {
          font-family: Arial, "Microsoft JhengHei", sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .date {
          background-color: #f3f4f6;
          padding: 5px 10px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
        }
        h2 {
          color: #2563eb;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
          margin-top: 30px;
        }
        .survey-results {
          margin-bottom: 30px;
        }
        .survey-item {
          padding: 10px 0;
          border-bottom: 1px dashed #eee;
        }
        .survey-item.long-title {
          display: block;
        }
        .survey-item .title {
          font-weight: bold;
          color: #2563eb;
          margin-right: 10px;
        }
        .survey-item.long-title .title {
          display: block;
          margin-bottom: 5px;
        }
        .badge {
          display: inline-block;
          background-color: #e5e7eb;
          color: #1f2937;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 5px;
        }
        .badge-success {
          background-color: #10b981;
          color: white;
        }
        .badge-error {
          background-color: #ef4444;
          color: white;
        }
        .badge-outline {
          background-color: transparent;
          border: 1px solid #9ca3af;
        }
        .chemical-info {
          margin-top: 20px;
        }
        .chemical-item {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        table th, table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        pre {
          background-color: #f3f4f6;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          overflow-x: auto;
        }
        .signature-section {
          margin-top: 40px;
        }
        .signature-container {
          margin-top: 10px;
          border: 1px solid #e5e7eb;
          padding: 10px;
          border-radius: 4px;
        }
        .signature-image {
          max-width: 100%;
          max-height: 150px;
        }
        .signature-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">化學品安全督導報告</div>
          <div class="date">日期: ${formattedDate}</div>
        </div>
        
        <h2>調查結果詳情</h2>
        <div class="survey-results">
          ${renderSurveyResults()}
        </div>
        
        <h2>化學品詳細資訊</h2>
        ${renderChemicalInfo()}
        
        <div class="signature-section">
          <h2>簽名確認</h2>
          
          <div class="signature-container">
            <div class="signature-title">業者簽名:</div>
            ${signature1 ? `<img src="${signature1}" alt="業者簽名" class="signature-image">` : 
                         '<p style="color:#888;">無簽名</p>'}
          </div>
          
          <div class="signature-container" style="margin-top: 20px;">
            <div class="signature-title">檢查人員簽名:</div>
            ${signature2 ? `<img src="${signature2}" alt="檢查人員簽名" class="signature-image">` : 
                         '<p style="color:#888;">無簽名</p>'}
          </div>
        </div>
        
        <div class="footer">
          <p>本文件由系統自動生成 - ${formattedDate}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
