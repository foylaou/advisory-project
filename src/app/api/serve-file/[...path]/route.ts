// src/app/api/serve-file/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// 獲取上傳目錄的絕對路徑
function getUploadPath(): string {
  // 直接從項目根目錄獲取 upload_file/uploads 路徑
  return path.join(process.cwd(), 'upload_file', 'uploads');
}

// 獲取檔案的MIME類型
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 從參數獲取請求的路徑
    const filePath = params.path.join('/');

    // 構建完整的文件路徑
    const fullPath = path.join(getUploadPath(), filePath);

    // 安全檢查：確保請求的文件在上傳目錄之內
    if (!fullPath.startsWith(getUploadPath())) {
      return new NextResponse('Access denied', { status: 403 });
    }

    // 檢查文件是否存在
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
    } catch (error) {
        Error(error as string);
      return new NextResponse('File not found', { status: 404 });
    }

    // 讀取文件
    const fileBuffer = await fs.promises.readFile(fullPath);

    // 返回文件內容
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': getMimeType(fullPath),
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
        'Cache-Control': 'public, max-age=86400' // 24小時快取
      }
    });

  } catch (error) {
    console.error('Serving file failed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
