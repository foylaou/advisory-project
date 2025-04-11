"use client"
import React, { useState } from 'react';
import { Survey, Model } from "survey-react-ui";
import "survey-core/survey-core.css";
import { useRouter } from 'next/navigation';
import surveyJson from './chemical-survey.json';

export default function Page() {
  const router = useRouter();
  const [model] = useState(new Model(surveyJson));

  // 監聽表單完成事件
  model.onComplete.add((sender) => {
    // 將調查結果存儲在 localStorage 中，以便在結果頁面使用
    localStorage.setItem('surveyResults', JSON.stringify(sender.data));

    // 導航到結果頁面
    router.push('/chemical-compliance/result');
  });

  return (
    <div className="container mx-auto p-4">
      <Survey model={model} />
    </div>
  );
}
