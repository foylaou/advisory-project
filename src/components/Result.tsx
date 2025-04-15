//src/app/Survey/[uuid]/result/page.tsx
"use client"
import axios from 'axios';
import SignatureComponent, { SignatureComponentHandle } from "@/components/Signature";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'; // 假設您已安裝了 react-hot-toast

// 定義一個介面來描述調查結果的結構
interface SurveyResult {
  [key: string]:
    | string
    | number
    | boolean
    | Array<string | number | boolean | Record<string, unknown>>
    | Record<string, unknown>
    | null
    | undefined;
}

export default function Result() {
  const router = useRouter();
  const componentRef = useRef<HTMLDivElement>(null);
  const signature1Ref = useRef<SignatureComponentHandle>(null);
  const signature2Ref = useRef<SignatureComponentHandle>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signatureIsEmpty1, setSignatureIsEmpty1] = useState(true);
  const [signatureIsEmpty2, setSignatureIsEmpty2] = useState(true);
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [surveyResults, setSurveyResults] = useState<SurveyResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [uuid, setUuid] = useState<string | null>(null);
// 頁面 mount 時先打一包「空請求」初始化

  // 在組件掛載時從 localStorage 讀取調查結果
  useEffect(() => {
    const storedUUID = localStorage.getItem('surveyUUID');
    const storedResults = localStorage.getItem('surveyResults');
    if (storedResults&&storedUUID) {
      setSurveyResults(JSON.parse(storedResults));
      setUuid(storedUUID);
    } else {
      // 如果沒有調查結果，重定向回表單頁面
      router.push('/Survey');
    }

    // 設置日期
    const now = new Date();
    const formatted = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    setFormattedDate(formatted);
  }, [router]);

  // 簽名狀態變化處理
  const handleSignatureChange1 = (isEmpty: boolean) => {
    setSignatureIsEmpty1(isEmpty);
  };

  const handleSignatureChange2 = (isEmpty: boolean) => {
    setSignatureIsEmpty2(isEmpty);
  };

  // 處理提交並生成 PDF
  const handleSubmit = async () => {
    if (!surveyResults) {
      toast.error('沒有調查數據可提交');
      return;
    }

    // 檢查簽名是否存在
    if (signatureIsEmpty1 || signatureIsEmpty2) {
      toast.error('請完成所有簽名後再提交');
      return;
    }

    setIsLoading(true);

    try {
      console.log("🧪 Ready check:", {
        uuid,
        surveyResults,
        signatureIsEmpty1,
        signatureIsEmpty2,
        isLoading
      });

      // 獲取簽名圖像的 Base64 數據
      const signature1Image = signature1Ref.current?.toDataURL();
      const signature2Image = signature2Ref.current?.toDataURL();

      if (!signature1Image || !signature2Image) {
        throw new Error('無法獲取簽名');
      }
      // 檢查uuid是否存在
      if (!uuid) {
        toast.error('無法獲取表單識別碼');
        return;
      }
      // 創建 FormData 對象
      const formData = new FormData();
      formData.append('signature1', signature1Image);
      formData.append('signature2', signature2Image);
      formData.append('surveyData', JSON.stringify(surveyResults));
      formData.append('surveyUUID', uuid);

    // 發送請求到後端 API
      const response = await axios.post('/api/generate-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const result = response.data;

      // 設置 PDF URL
      setPdfUrl(result.fileUrl);

      toast.success('PDF 生成成功！您可以下載文件');

    } catch (error) {
      console.error('生成 PDF 時發生錯誤:', error);
      toast.error(error instanceof Error ? error.message : '生成 PDF 失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  // 清除數據並返回表單頁面
  const handleReturn = () => {
    if (window.confirm('確定要返回並清除當前數據嗎？')) {
      localStorage.removeItem('surveyResults');
      localStorage.removeItem('surveyUUID'); // 也清除UUID
      router.push(`/Survey/${uuid}`); // 使路徑與其他地方一致
    }
  };

  // 渲染化學品詳細資訊面板
  const renderChemicalPanel = (chemicalInfo: SurveyResult[keyof SurveyResult]) => {
    // 如果是數組，表示是從 panelDynamic 來的多個化學品
    if (Array.isArray(chemicalInfo)) {
      return (
        <div className="space-y-6">
          {chemicalInfo.map((chemical, index) => (
            <div key={index} className="card bg-base-100 shadow-md">
              <div className="card-body p-4">
                <h4 className="card-title text-primary text-lg">化學品 #{index + 1}</h4>
                <div className="overflow-x-auto w-full">
                  <table className="table table-zebra w-full table-auto">
                    <thead>
                      <tr className="bg-base-200">
                        <th className="w-1/3 text-left">項目</th>
                        <th className="w-2/3 text-left">內容</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(chemical).map(([key, value]) => (
                        <tr key={key} className="hover">
                          <td className="font-medium break-words whitespace-normal">{key}</td>
                          <td className="break-words whitespace-normal">
                            {Array.isArray(value)
                              ? value.map((item, i) => (
                                  <span key={i} className="badge badge-sm badge-outline mr-1 mb-1">
                                    {String(item)}
                                  </span>
                                ))
                              : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 如果是單個對象
    if (typeof chemicalInfo === 'object' && chemicalInfo !== null) {
      return (
        <div className="card bg-base-100 shadow-md mt-2">
          <div className="card-body p-4">
            <div className="overflow-x-auto w-full">
              <table className="table table-zebra w-full table-auto">
                <thead>
                  <tr className="bg-base-200">
                    <th className="w-1/3 text-left">項目</th>
                    <th className="w-2/3 text-left">內容</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(chemicalInfo).map(([itemKey, itemValue]) => (
                    <tr key={itemKey} className="hover">
                      <td className="font-medium break-words whitespace-normal">{itemKey}</td>
                      <td className="break-words whitespace-normal">
                        {Array.isArray(itemValue)
                          ? itemValue.map((item, i) => (
                              <span key={i} className="badge badge-sm badge-outline mr-1 mb-1">
                                {String(item)}
                              </span>
                            ))
                          : String(itemValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 嘗試解析字符串
    if (typeof chemicalInfo === 'string') {
      try {
        if (chemicalInfo.includes('{') && chemicalInfo.includes('}')) {
          // 嘗試提取JSON部分
          const jsonStart = chemicalInfo.indexOf('{');
          const jsonEnd = chemicalInfo.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = chemicalInfo.substring(jsonStart, jsonEnd);
            const parsedData = JSON.parse(jsonStr);
            return renderChemicalPanel(parsedData);
          }
        }

        // 如果是有效的JSON字符串
        const parsedData = JSON.parse(chemicalInfo);
        return renderChemicalPanel(parsedData);
      } catch {
        // 處理 [object Object] 或其他無效格式
        if (chemicalInfo.includes('[object Object]')) {
          return (
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>化學品資訊格式有誤。此數據包含未正確序列化的對象。</span>
            </div>
          );
        }

        // 其他字符串直接顯示
        return <div className="p-2 text-base-content">{chemicalInfo}</div>;
      }
    }

    // 兜底情況
    return <div className="badge badge-outline badge-lg">無化學品詳細資訊</div>;
  };

  // 渲染調查結果
  const renderSurveyResults = () => {
    if (!surveyResults) return null;

    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-primary">調查結果詳情</h2>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            {Object.entries(surveyResults).map(([key, value]) => {
              if (value === undefined) return null;

              // 特殊處理化學品詳細資訊
              if (key === "化學品詳細資訊") {
                return (
                  <div key={key} className="mb-6">
                    <div className="divider before:bg-primary/20 after:bg-primary/20">
                      <h3 className="font-bold text-lg text-primary">{key}</h3>
                    </div>
                    <div className="mt-4">
                      {renderChemicalPanel(value)}
                    </div>
                  </div>
                );
              }

              // 處理長文字標題的特殊情況 - 如果標題超過特定長度，使用不同的布局
              const isLongTitle = typeof key === 'string' && key.length > 60;

              return (
                <div key={key} className={`py-2 ${isLongTitle ? 'border-b border-base-200 pb-4' : ''}`}>
                  <div className={isLongTitle ? "space-y-2" : "flex flex-wrap items-center gap-2"}>
                    <div className={`font-medium text-primary ${isLongTitle ? 'mb-2' : ''}`}>
                      {key}:
                    </div>
                    <div className={isLongTitle ? "ml-0" : "ml-2"}>
                      {typeof value === 'boolean' ? (
                        <span className={`badge ${value ? 'badge-success' : 'badge-error'} badge-lg`}>
                          {value ? '是' : '否'}
                        </span>
                      ) : Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1">
                          {value.map((item, idx) => (
                            <span key={idx} className="badge badge-ghost badge-md">
                              {String(item)}
                            </span>
                          ))}
                        </div>
                      ) : typeof value === 'object' && value !== null ? (
                        <code className="text-xs bg-base-200 p-2 rounded block overflow-x-auto whitespace-pre">
                          {JSON.stringify(value, null, 2)}
                        </code>
                      ) : (
                        <span className="badge badge-ghost badge-lg whitespace-normal text-left">
                          {value === null ? '無' : String(value)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card bg-base-100 shadow-xl">
        <div ref={componentRef} className="card-body p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-base-300">
            <div>
              <h1 className="card-title text-3xl font-bold text-primary">調查結果確認</h1>
              <p className="text-base-content/70">請確認以下資訊並簽名</p>
            </div>
            <div className="badge badge-primary badge-outline p-4 mt-4 md:mt-0">
              <span className="font-medium">日期:</span> {formattedDate}
            </div>
          </div>

          {renderSurveyResults()}

          <div className="divider before:bg-primary/20 after:bg-primary/20">簽名區域</div>

          <div className="mt-4">
            <h2 className="text-xl font-bold text-primary mb-2">業者</h2>
            <div className="p-4 border-2 border-dashed border-base-300 rounded-lg bg-base-200/50">
              <SignatureComponent
                ref={signature1Ref}
                onSignatureChange={handleSignatureChange1}
              />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-primary mb-2">檢查人員</h2>
            <div className="p-4 border-2 border-dashed border-base-300 rounded-lg bg-base-200/50">
              <SignatureComponent
                ref={signature2Ref}
                onSignatureChange={handleSignatureChange2}
              />
            </div>
          </div>
        </div>

        <div className="card-actions justify-end p-6 bg-base-200 border-t border-base-300">
          {pdfUrl ? (
            <div className="w-full">
              <div className="alert alert-success mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>PDF 已成功生成！您可以下載或返回填寫新的表單</span>
              </div>

              <div className="flex flex-wrap gap-4">
                <a
                  href={pdfUrl}
                  download
                  className="btn btn-success gap-2 flex-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下載 PDF
                </a>

                <button
                  onClick={handleReturn}
                  className="btn btn-outline gap-2 flex-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  返回填寫新表單
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <button
                onClick={handleSubmit}
                disabled={isLoading || signatureIsEmpty1 || signatureIsEmpty2}
                className="btn btn-primary btn-lg w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-md"></span>
                    處理中...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    確認並生成 PDF
                  </>
                )}
              </button>

              {(signatureIsEmpty1 || signatureIsEmpty2) && !isLoading && (
                <div className="alert alert-warning mt-4 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>請先完成所有簽名再提交</span>
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={handleReturn}
                  className="btn btn-ghost btn-sm w-full"
                >
                  取消並返回
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
