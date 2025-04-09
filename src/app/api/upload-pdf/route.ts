// app/api/upload-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const surveyId = formData.get('surveyId') as string;
    const responseId = formData.get('responseId') as string;

    if (!file || !surveyId || !responseId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    // 將文件保存到本地
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `survey_${surveyId}_response_${responseId}.pdf`;

    // 確保上傳目錄存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // 返回可訪問的文件 URL
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      message: 'PDF 已成功上傳'
    });

  } catch (error) {
    console.error('上傳文件時發生錯誤:', error);
    return NextResponse.json({
      error: '上傳失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
