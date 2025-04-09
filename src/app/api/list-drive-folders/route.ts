// app/api/list-drive-folders/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    // 设置Google云端硬盘认证
    const auth = new google.auth.GoogleAuth({
      keyFile:'/Users/foyliu/Desktop/React/advisory-project/src/app/api/client_secret_870063037866-et0af4nha3kurm9rd8jk3acts9plt05l.apps.googleusercontent.com.json',
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 查询所有的文件夹
    // 注: 这里只返回服务账号有权限访问的文件夹
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const folders = response.data.files || [];

    return NextResponse.json({
      success: true,
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name
      }))
    });

  } catch (error) {
    console.error('获取文件夹列表时发生错误:', error);
    return NextResponse.json({
      error: '获取文件夹失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
