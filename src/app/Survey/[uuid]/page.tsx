//src/app/Survey/[uuid]/page.tsx
"use client"
import React, { JSX, useEffect, useState } from 'react';
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.css";
import { useRouter } from 'next/navigation';
import { getSurvey } from "@/services/SurveyServices";

// 類型定義
interface SurveyData {
  [key: string]: unknown;
}

interface SurveyCompletionEvent {
  data: SurveyData;
}

interface SurveyOnComplete {
  add: (callback: (sender: SurveyCompletionEvent) => void) => void;
}

interface SurveyModelType {
  onComplete: SurveyOnComplete;
  // 根據需要添加其他屬性
}

export default function Page({ params }: { params: Promise<{ uuid: string }> }): JSX.Element {
  // 使用 React.use() 解包 params Promise
  const { uuid } = React.use(params);
  const router = useRouter();
  const [model, setModel] = useState<SurveyModelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 只在客戶端運行
    if (typeof window === 'undefined') return;

    let isComponentMounted = true;

    // 初始化調查問卷的函數
    const initSurvey = async (): Promise<void> => {
      try {
        setLoading(true);

        // 獲取表單數據
        const surveyData = await getSurvey(uuid);
          if (!surveyData) {
            // 如果沒有找到表單，重定向到首頁
            router.push("/");
            return;
          }
        if (!surveyData.jsonSchema) {
          setError("表單結構缺失");
          setLoading(false);
          return;
        }

        // 動態導入 survey-core
        const surveyCore = await import('survey-core');
        const ModelConstructor = surveyCore.Model as new (json: unknown) => SurveyModelType;

        // 確保 jsonSchema 是一個對象
        let jsonSchema;
        try {
          // 嘗試解析 jsonSchema 如果它是一個字符串
          jsonSchema = typeof surveyData.jsonSchema === 'string'
            ? JSON.parse(surveyData.jsonSchema)
            : surveyData.jsonSchema;
        } catch (e) {
          Error(String(e));
          setError("表單結構無效");
          setLoading(false);
          return;
        }

        // 創建模型實例
        const surveyModel = new ModelConstructor(jsonSchema);

        // 添加完成處理器
        surveyModel.onComplete.add((sender: SurveyCompletionEvent) => {
          localStorage.setItem('surveyUUID', uuid);
          localStorage.setItem('surveyResults', JSON.stringify(sender.data));
         router.push(`/Survey/${uuid}/result`); // 修改為正確的路徑格式
        });

        // 只有在組件仍然掛載時才更新狀態
        if (isComponentMounted) {
          setModel(surveyModel);
          setLoading(false);
        }
      } catch (error) {
        // 類型安全的錯誤處理
        console.error("Failed to load survey model:",
          error instanceof Error ? error.message : "Unknown error");

        if (isComponentMounted) {
          setError("載入表單時發生錯誤");
          setLoading(false);
        }
      }
    };

    initSurvey();

    // 清理函數
    return () => {
      isComponentMounted = false;
    };
  }, [router, uuid]); // 修改依賴項為解包後的 uuid

  // 顯示錯誤
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">錯誤！</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  // 顯示加載中或表單
  return (
    <div className="container mx-auto p-4">
      {loading ? (
        <div className="text-center p-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2">載入表單中...</p>
        </div>
      ) : model ? (
        <Survey model={model} />
      ) : (
        <div className="text-center p-4">
          <p>找不到表單，請確認您的表單代碼是否正確。</p>
        </div>
      )}
    </div>
  );
}
