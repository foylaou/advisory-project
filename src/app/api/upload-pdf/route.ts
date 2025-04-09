// app/api/upload-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { google } from 'googleapis';
import stream from 'stream';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const surveyId = formData.get('surveyId') as string;
    const responseId = formData.get('responseId') as string;

    if (!file || !surveyId || !responseId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    // 设置Google云端硬盘认证
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'path/to/your/service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 准备文件数据
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `survey_${surveyId}_response_${responseId}.pdf`;

    // 创建可读流
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    // 上传文件到Google云端硬盘
    const driveResponse = await drive.files.create({
      requestBody: {
        name: filename,
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: bufferStream,
      },
    });

    // 获取文件ID
    const fileId = driveResponse.data.id;

    // 可选：设置文件权限（公开访问权限）
    // 如果要设置为私有，可以跳过这一步
    await drive.permissions.create({
      fileId: fileId!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // 获取文件的共享链接
    const fileData = await drive.files.get({
      fileId: fileId!,
      fields: 'webViewLink',
    });

    const fileUrl = fileData.data.webViewLink;

    return NextResponse.json({
      success: true,
      fileId,
      fileUrl,
      message: 'PDF 已成功上傳到Google雲端硬碟'
    });

  } catch (error) {
    console.error('上傳文件到Google雲端硬碟時發生錯誤:', error);
    return NextResponse.json({
      error: '上傳失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
