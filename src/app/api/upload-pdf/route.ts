// app/api/upload-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import SambaClient from 'samba-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as Blob;  // 修正: 從 'file' 改為 'pdf'
    const surveyData = formData.get('surveyData') as string;  // 獲取調查數據

    if (!file) {
      return NextResponse.json({ error: '缺少PDF文件' }, { status: 400 });
    }

    // 生成唯一的文件名
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `survey_${timestamp}_${randomStr}.pdf`;

    // 解析調查數據到日誌中，但不創建未使用的變數
    try {
      if (surveyData) {
        // 只解析並記錄，不賦值給未使用的變數
        console.log('調查數據解析成功，長度:', JSON.parse(surveyData).length || '未知');
      }
    } catch (e) {
      console.warn('無法解析調查數據:', e);
    }

    // 將文件轉換為 Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 確保本地上傳目錄存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // 保存到本地文件系統
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // 準備 Samba 客戶端
    const sambaClient = new SambaClient({
      address: '//isha/共用區', // 服務器和共享名稱
      username: 'foy', // 需要填入實際用戶名
      password: 't0955787053S', // 需要填入實際密碼
      domain: 'WORKGROUP', // 或您的實際域名
      maxProtocol: 'SMB3', // 指定 SMB 協議版本
    });

    // 嘗試上傳到 Samba 共享
    let smbUploaded = false;
    try {
      // 上傳文件到 Samba 共享，指定完整的目標路徑
      await sambaClient.sendFile(
        filepath,
        '哲嘉/化學品管理安全督導/' + filename
      );
      console.log('文件已成功上傳到 Samba 共享');
      smbUploaded = true;
    } catch (smbError) {
      console.error('上傳到 Samba 共享時發生錯誤:', smbError);
      // 即使 Samba 上傳失敗，我們仍然返回成功，因為本地文件已保存
    }

    // 返回可訪問的文件 URL
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      message: 'PDF 已成功上傳',
      smbUploaded,
      smbDetails: smbUploaded ? '已上傳至共享資料夾' : '僅保存於本地服務器'
    });

  } catch (error) {
    console.error('上傳文件時發生錯誤:', error);
    return NextResponse.json({
      error: '上傳失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
