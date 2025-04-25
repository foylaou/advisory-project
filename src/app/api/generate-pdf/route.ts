import { NextRequest, NextResponse } from 'next/server';
import { mkdir, access,stat } from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import {getSurveyCode, saveSurveyResponseWithPDF} from "@/services/SurveyServices";
import { generateGUIDE, generateSUPV } from '@/services/generatereport';
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
    const code =await getSurveyCode(surveyid)
    let htmlContent = '';

    switch (code?.code?.match(/^[A-Z]+/)?.[0]) {
      case 'SUPV':
        htmlContent = generateSUPV(surveyData, signature1, signature2);
        break;

      case 'GUIDE':
        htmlContent = generateGUIDE(surveyData, signature1, signature2);
        break;

      default:
        throw new Error(`不支援的問卷類型: ${code?.code}`);
    }



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


