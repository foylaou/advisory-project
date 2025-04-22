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
      margin: { 
        top: '1cm',    // 增加上邊距
        right: '1.5cm', // 略微增加右邊距
        bottom: '1cm',  // 增加下邊距
        left: '1.5cm'   // 略微增加左邊距
      },
      preferCSSPageSize: true, // 優先使用 CSS 分頁設定
      displayHeaderFooter: true, // 允許頁眉頁腳
      headerTemplate: '', // 可以客製化頁眉
      footerTemplate: `
        <div style="width:100%; text-align:center; font-size:10px; color:#888;">
          第 <span class="pageNumber"></span> 頁，共 <span class="totalPages"></span> 頁
        </div>
      `,
      landscape: false,
      pageRanges: '' // 預設印全部頁面
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
  // 格式化日期
  const now = new Date();
  const formattedDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

  // 處理化學品詳細資訊
  const renderChemicalInfo = (): string => {
    const chemicalData = surveyData['化學品詳細資訊'];
    if (!chemicalData) return '';

    // 確保化學品資訊是數組
    const chemicalInfoArray = Array.isArray(chemicalData)
      ? chemicalData as unknown[]
      : [];

    if (chemicalInfoArray.length === 0) return '';

    // 只有在有化學品資訊時才渲染化學品部分
    return `
      <div class="section">
        <h2>化學品詳細資訊</h2>
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
                          ? value.map(item => `<div class="badge">${String(item)}</div>`).join('') 
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
      </div>
    `;
  };

  // 將調查結果按照分組方式渲染
  const renderBasicInfo = (): string => {
    // 這些是基本信息，將放在第一個section
    const basicInfoKeys = [
      '督導對象轄區', '公司/工廠名稱', '督導區域', '廠方人員', 
      '廠方人員電話', '督導單位', '督導人員姓名', '督導人員聯絡方式','督導日期'
    ];
    
    let basicInfoHtml = '';
    
    for (const key of basicInfoKeys) {
      if (surveyData[key] !== undefined) {
        const value = surveyData[key];
        basicInfoHtml += `
          <div class="survey-item">
            <div class="qustion">${key}:</div>
            <div class="anser">${value === null ? '無' : String(value)}</div>
          </div>
        `;
      }
    }
    
    return basicInfoHtml ? `
      <div class="section">
        <h2>督導基本資料</h2>
        <div class="survey-results">
          ${basicInfoHtml}
        </div>
      </div>
    ` : '';
  };

  // 渲染檢查項目部分
  const renderCheckItems = (): string => {
    // 這些是基本信息的鍵，用於過濾掉
    const basicInfoKeys = new Set([
      '督導對象轄區', '公司/工廠名稱', '督導區域', '廠方人員', 
      '廠方人員電話', '督導單位', '督導人員姓名', '督導人員聯絡方式','督導日期'
    ]);
    

    // 過濾出檢查項目
    const checkItems = Object.entries(surveyData)
    .filter(([key]) => {
      // 使用部分匹配而非精確匹配
      return !(
        basicInfoKeys.has(key) || 
        key.includes('督導結果') || 
        key.includes('違反法規條款') || 
        key.includes('違反事實')
      );
    })
    .map(([key, value]) => {
      // 根據不同的值類型，使用不同的渲染方式
      let valueHtml = '';
      
      // 使用正則表達式匹配字符串開頭
      if (typeof value === 'string') {
        if (/^符合/.test(value)) {
          valueHtml = `<div class="badge badge-success">${value}</div>`;
        } else if (/^不符合/.test(value)) {
          valueHtml = `<div class="badge badge-error">${value}</div>`;
        } else if (/^不適用/.test(value)) {
          valueHtml = `<div class="badge badge-info">${value}</div>`;
        } else {
          valueHtml = `<span>${value}</span>`;
        }
      } else if (typeof value === 'boolean') {
        valueHtml = `<div class="badge ${value ? 'badge-success' : 'badge-error'}">${value ? '是' : '否'}</div>`;
      } else if (Array.isArray(value)) {
        valueHtml = value.map(item => `<div class="badge badge-outline">${String(item)}</div>`).join(' ');
      } else if (typeof value === 'object' && value !== null) {
        valueHtml = `<pre>${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        valueHtml = `<span>${value === null ? '無' : String(value)}</span>`;
      }

      return `
        <div class="survey-item long-title">
          <div class="qustion">${key}:</div>
          <div class="anser">${valueHtml}</div>
        </div>
      `;
    });
    
    // 將檢查項目分成幾個section，每個section包含4個項目
    const sections = [];
    const itemsPerSection = 4;
    
    for (let i = 0; i < checkItems.length; i += itemsPerSection) {
      const sectionItems = checkItems.slice(i, i + itemsPerSection);
      sections.push(`
        <div class="section">
          ${i === 0 ? '<h2>督導項目</h2>' : ''}
          <div class="survey-results">
            ${sectionItems.join('')}
          </div>
        </div>
      `);
    }
    
    return sections.join('');
  };
// 渲染督導結果
const renderFinalResult = (): string => {
  // 找出所有包含"督導結果"的鍵
  const resultKeys = Object.keys(surveyData).filter(key => key.includes('督導結果'));
  
  // 找出違反法規條款和違反事實的鍵
  const lawKeys = Object.keys(surveyData).filter(key => key.includes('違反法規條款'));
  const factKeys = Object.keys(surveyData).filter(key => key.includes('違反事實'));
  
  // 如果都沒有相關鍵，則不渲染此部分
  if (resultKeys.length === 0 && lawKeys.length === 0 && factKeys.length === 0) return '';
  
  // 處理督導結果
  const resultItems = resultKeys.map(key => {
    const value = surveyData[key];
    let resultHtml = '';
    
    if (typeof value === 'string') {
      if (/不符合/.test(value)) {
        resultHtml = `<div class="badge badge-error" style="font-weight: bold;">${value}</div>`;
      } else if (/符合/.test(value)) {
        resultHtml = `<div class="badge badge-success" style="font-weight: bold;">${value}</div>`;
      } else if (/不適用/.test(value)) {
        resultHtml = `<div class="badge badge-info" style="font-weight: bold;">${value}</div>`;
      } else {
        resultHtml = `<span>${value}</span>`;
      }
    } else {
      resultHtml = `<span>${String(value)}</span>`;
    }
    
    return `
      <div class="survey-item">
        <div class="qustion">${key}:</div>
        <div class="anser">
          ${resultHtml}
        </div>
      </div>
    `;
  });
  
  // 處理違反法規條款
  const lawItems = lawKeys.map(key => {
    const value = surveyData[key];
    return `
      <div class="survey-item">
        <div class="qustion">${key}:</div>
        <div class="anser">${typeof value === 'string' ? value : String(value)}</div>
      </div>
    `;
  });
  
  // 處理違反事實
  const factItems = factKeys.map(key => {
    const value = surveyData[key];
    return `
      <div class="survey-item">
        <div class="qustion">${key}:</div>
        <div class="anser">${typeof value === 'string' ? value : String(value)}</div>
      </div>
    `;
  });
  
  // 決定標題
  let sectionTitle = "督導結果";

  
  return `
    <div class="section">
      <h2>${sectionTitle}</h2>
      <div class="survey-results">
        ${resultItems.join('')}
        ${lawItems.join('')}
        ${factItems.join('')}
      </div>
    </div>
  `;
};

  // 渲染簽名部分
  const renderSignatures = (): string => {
    return `
      <div class="section">
        <h2>簽名確認</h2>
        
        <div class="signature-container">
          <div class="signature-title">廠方人員簽名:</div>
          ${signature1 ? `<img src="${signature1}" alt="廠方人員簽名" class="signature-image">` : 
                       '<p style="color:#888;">無簽名</p>'}
        </div>
        
        <div class="signature-container" style="margin-top: 20px;">
          <div class="signature-title">督導人員簽名:</div>
          ${signature2 ? `<img src="${signature2}" alt="督導人員簽名" class="signature-image">` : 
                       '<p style="color:#888;">無簽名</p>'}
        </div>
        
        <div class="footer">
          <p>本文件由系統自動生成 - ${formattedDate}</p>
        </div>
      </div>
    `;
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
        /* 設定頁面基本樣式 */
        @page {
          size: A4;
          margin: 1.5cm;
        }
        
        body {
          font-family: Arial, "Microsoft JhengHei", sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          background-color: #fff;
        }
        
        /* 不使用容器的圓角，改為分節顯示內容 */
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background-color: #fff;
        }
        
        .header-section {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 90vh; /* 設定高度接近 A4 頁面高度 */
          text-align: center;
          margin-bottom: 30px;
          /* 移除邊框和邊距 */
          border: none;
          background-color: transparent;
          page-break-after: always; /* 確保標題頁後換頁 */
        }
          /* 調整標題樣式 */
          .header-section .title {
            font-size: 32px;
            margin-bottom: 20px;
          }

          /* 調整日期樣式 */
          .header-section .date {
            margin-top: 20px;
          }
        
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        
        .date {
          display: inline-block;
          background-color: #f3f4f6;
          padding: 8px 15px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          font-size: 16px;
          font-weight: 500;
          margin-top: 10px;
        }
        
        h2 {
          color: #2563eb;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
          margin-top: 30px;
          font-size: 22px;
        }
        
        .survey-item {
          margin-bottom: 15px;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
          page-break-inside: avoid;
        }
        
        .survey-item .qustion {
          font-weight: bold;
          margin-bottom: 8px;
          color: #4b5563;
        }
        
        .survey-item .anser {
          margin-left: 15px;
          font-size: 18px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        .survey-item.long-title .qustion {
          margin-bottom: 10px;
        }
        
        /* 改良 badge 樣式以確保列印時顯示 */
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-right: 8px;
          /* 使用粗邊框增加可見度 */
          border: 2px solid #000;
          /* 確保背景色和文字在列印時顯示 */
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        
        /* 使用列印友好的顏色組合 */
        .badge-success {
          background-color: #acd4ff !important;
          color: #000000 !important;
          border: 2px solid #0066cc !important;
          /* 添加文字效果增強可見性 */
          text-decoration: none !important;
          font-weight: bold !important;
        }
        
        .badge-error {
          background-color: #f8d1d8 !important;
          color: #000000 !important;
          border: 2px solid #cc0033 !important;
          /* 添加文字效果增強可見性 */
          text-decoration: none !important;
          font-weight: bold !important;
        }
        
        .badge-info {
          background-color: #d5d6d6 !important;
          color: #000000 !important;
          border: 2px solid #666666 !important;
          /* 添加文字效果增強可見性 */
          text-decoration: none !important;
          font-weight: bold !important;
        }
        
        .chemical-info {
          margin-top: 25px;
        }
        
        .chemical-item {
          margin-bottom: 25px;
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          page-break-inside: avoid;
        }
        
        .chemical-item h4 {
          color: #2563eb;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        table th, table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        table th {
          background-color: #f3f4f6;
          font-weight: bold;
          color: #4b5563;
        }
        
        table tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .signature-section {
          margin-top: 40px;
        }
        
        .signature-container {
          margin-top: 20px;
          border: 1px solid #e5e7eb;
          padding: 20px;
          border-radius: 8px;
          background-color: #f9fafb;
          page-break-inside: avoid;
        }
        
        .signature-image {
          max-width: 100%;
          max-height: 150px;
          border-bottom: 1px dashed #ccc;
          padding-bottom: 10px;
        }
        
        .signature-title {
          font-weight: bold;
          margin-bottom: 15px;
          color: #4b5563;
          font-size: 16px;
        }
        
        .footer {
          margin-top: 60px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
          page-break-inside: avoid;
        }
        
        /* 列印專用樣式 */
        @media print {
          body {
            background-color: white;
          }
          
          .section {
            border: 1px solid #ddd !important;
            border-radius: 8px !important;
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
            background-color: #fff !important;
          }
            .header-section {
            height: 90vh;
            page-break-after: always;
            border: none !important;
            background-color: transparent !important;
          }
          h2 {
            page-break-before: auto;
            page-break-after: avoid;
            margin-top: 20px !important;
          }
          
          .survey-item, 
          .chemical-item,
          .signature-container {
            page-break-inside: avoid !important;
          }
          
          .badge {
            display: inline-block !important;
            visibility: visible !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
    <div class="container">
    <div class="header-section">
      <div class="title">化學品安全督導報告</div>
      <div class="date">日期: ${formattedDate}</div>
    </div>
      
      ${renderBasicInfo()}
      ${renderCheckItems()}
      ${renderFinalResult()}
      ${renderChemicalInfo()}
      ${renderSignatures()}
      </div>
    </body>
    </html>
  `;
}