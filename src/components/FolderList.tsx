// components/FolderList.tsx
"use client"

import { useState, useEffect } from 'react';

interface Folder {
  id: string;
  name: string;
}

export default function FolderList() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIds, setShowIds] = useState(false);

  useEffect(() => {
    async function loadFolders() {
      setLoading(true);
      try {
        const response = await fetch('/api/list-drive-folders');
        const data = await response.json();

        if (data.success) {
          setFolders(data.folders);
          setError(null);
        } else {
          setError(data.error || '获取文件夹失败');
        }
      } catch (error) {
        setError('获取文件夹时出错: ' + (error instanceof Error ? error.message : '未知错误'));
      } finally {
        setLoading(false);
      }
    }

    loadFolders();
  }, []);

  const toggleShowIds = () => {
    setShowIds(!showIds);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板: ' + text);
  };

  return (
    <div className="my-6 p-4 border rounded bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Google云端硬盘文件夹列表</h2>
        <button
          onClick={toggleShowIds}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          {showIds ? '隐藏文件夹ID' : '显示文件夹ID'}
        </button>
      </div>

      {loading ? (
        <p>正在加载文件夹列表...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : folders.length === 0 ? (
        <p>找不到可访问的文件夹</p>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-600">总共 {folders.length} 个文件夹</p>
          <div className="max-h-80 overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left border-b">文件夹名称</th>
                  {showIds && <th className="py-2 px-4 text-left border-b">文件夹ID</th>}
                  {showIds && <th className="py-2 px-4 text-left border-b">操作</th>}
                </tr>
              </thead>
              <tbody>
                {folders.map((folder) => (
                  <tr key={folder.id} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b">{folder.name}</td>
                    {showIds && (
                      <td className="py-2 px-4 border-b font-mono text-xs">
                        {folder.id}
                      </td>
                    )}
                    {showIds && (
                      <td className="py-2 px-4 border-b">
                        <button
                          onClick={() => copyToClipboard(folder.id)}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                        >
                          复制ID
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
