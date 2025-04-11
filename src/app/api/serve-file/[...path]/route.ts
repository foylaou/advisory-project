// src/app/api/serve-file/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// GET handler for Next.js 15
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Await the params Promise to get the actual path segments
  const resolvedParams = await params;
  const pathSegments = resolvedParams.path;

  try {
    // Join path segments to create file path
    const filePath = pathSegments.join('/');

    // Get upload directory and full file path
    const uploadDir = path.join(process.cwd(), 'upload_file', 'uploads');
    const fullPath = path.join(uploadDir, filePath);

    // Security check to prevent directory traversal
    if (!fullPath.startsWith(uploadDir)) {
      return NextResponse.json({ error: '禁止訪問' }, { status: 403 });
    }

    try {
      // Check if file exists
      await fs.access(fullPath);
    } catch (error) {
      Error(error as string);
      return NextResponse.json({ error: '找不到檔案' }, { status: 404 });
    }

    // Read the file
    const fileBuffer = await fs.readFile(fullPath);

    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
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
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('檔案服務錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤', details: (error as Error).message },
      { status: 500 }
    );
  }
}
