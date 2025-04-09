"use client"
import { useParams } from 'next/navigation';
import React, { useRef, useState, useEffect } from 'react';
import domtoimage, { Options } from 'dom-to-image';
import { jsPDF } from 'jspdf';
import SignatureComponent from "@/components/Signature";
import { Loader2 } from "lucide-react";

interface EnhancedOptions extends Options {
  scale?: number;
}


export default function Page() {
  const params = useParams();
  const componentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signatureIsEmpty1, setSignatureIsEmpty1] = useState(true);
  const [signatureIsEmpty2, setSignatureIsEmpty2] = useState(true);
  const [formattedDate, setFormattedDate] = useState<string>('');

  const surveyId = params.surveyId;
  const responseId = params.responseId;

  // 處理日期格式化，以避免水合錯誤
  useEffect(() => {
    // 客戶端渲染時設置日期，確保格式統一
    const now = new Date();
    // 使用固定的格式，不依賴用戶的地區設置
    const formatted = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    setFormattedDate(formatted);
  }, []);

  // 簽名狀態變化處理
  const handleSignatureChange1 = (isEmpty: boolean) => {
    setSignatureIsEmpty1(isEmpty);
  };
  const handleSignatureChange2 = (isEmpty: boolean) => {
    setSignatureIsEmpty2(isEmpty);
  };

  // 生成 PDF 並上傳到伺服器
  const handleSaveToCloud = async () => {
    if (!componentRef.current) return;

    // 檢查簽名是否存在
    if (signatureIsEmpty1 || signatureIsEmpty2 ) {
      alert('請完成簽名後再提交');
      return;
    }

    setIsLoading(true);

    try {
      // 使用 dom-to-image 將組件轉換為圖像
      const options: EnhancedOptions = {
        quality: 1.0,
        bgcolor: '#ffffff', // 確保白色背景
        scale: 2 // 增加清晰度
      };

      // 直接使用 toPng 方法，無需類型斷言
      const dataUrl = await domtoimage.toPng(componentRef.current, options);

      // 創建 PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
      });

      // 創建圖片並獲取尺寸
      const img = new Image();
      img.src = dataUrl;

      // 等待圖片加載
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (img.height * imgWidth) / img.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);

      // 生成 PDF Blob
      const pdfBlob = pdf.output('blob');

      // 創建 FormData 用於上傳
      const formData = new FormData();
      formData.append('file', pdfBlob, `survey_${surveyId}_response_${responseId}.pdf`);
      formData.append('surveyId', String(surveyId));
      formData.append('responseId', String(responseId));

      // 上傳到伺服器
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
          Error("上傳失敗")
      }

      const result = await response.json();

      // 顯示成功訊息
      alert(`PDF 已成功生成並上傳! 檔案 URL: ${result.fileUrl}`);

      // 提供一個下載連結作為備份
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `survey_${surveyId}_response_${responseId}.pdf`;
      a.click();

    } catch (error) {
      console.error('生成或上傳 PDF 時發生錯誤:', error);
      alert('生成或上傳 PDF 失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-gray-50 rounded-lg shadow-md overflow-hidden">
        {/* 內容區域 - 會被轉換為 PDF */}
        <div ref={componentRef} className="p-8 bg-white">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">調查結果確認</h1>
              <p className="text-gray-600">請確認以下資訊並簽名</p>
            </div>
            <div className="text-right">
              <div className="text-gray-700"><span className="font-medium">Survey ID:</span> {surveyId}</div>
              <div className="text-gray-700"><span className="font-medium">Response ID:</span> {responseId}</div>
              {/* 使用客戶端處理的日期格式 */}
              <div className="text-gray-700">
                <span className="font-medium">日期:</span> {formattedDate}
              </div>
            </div>
          </div>

          {/* 這裡可以增加調查結果的顯示 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">調查結果摘要</h2>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <p className="text-gray-700 mb-2">
                • 此文件確認您已完成ID為 {surveyId} 的調查。
              </p>
              <p className="text-gray-700 mb-2">
                • 您的回覆已被記錄，回覆ID為 {responseId}。
              </p>
              <p className="text-gray-700">
                • 簽署本文件即表示您確認所提供的資訊正確無誤。
              </p>
            </div>
          </div>

          {/* 簽名區域 */}
          <div className="mt-8 border-t pt-6">
            <h2>業者</h2>
            <SignatureComponent onSignatureChange={handleSignatureChange1} />
          </div>
                    {/* 簽名區域 */}
          <div className="mt-8 border-t pt-6">
            <h2>檢查人員</h2>
            <SignatureComponent onSignatureChange={handleSignatureChange2} />
          </div>
        </div>

        {/* 操作按鈕 - 不會被包含在 PDF 中 */}
        <div className="p-4 bg-gray-100 border-t border-gray-200">
          <button
            onClick={handleSaveToCloud}
            disabled={isLoading || signatureIsEmpty1 || signatureIsEmpty2}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium flex items-center justify-center disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                處理中...
              </>
            ) : (
              '確認並提交簽名文件'
            )}
          </button>
          {signatureIsEmpty1 && signatureIsEmpty2 && !isLoading && (
            <p className="text-center text-amber-600 mt-2 text-sm">
              請先完成簽名再提交
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
