'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'; // 假設您已安裝了 react-hot-toast
export default function SurveyCodePage() {
  const router = useRouter();
  const [surveyCode, setSurveyCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證表單代碼
    if (surveyCode.trim() === '') {
      alert('請輸入有效的表單代碼');
      return;
    }
    if(surveyCode.trim() === "04861064" ) {
            router.push(`/chemical-compliance`);
    }
    // 導航到相應的調查頁面
        toast.error("查無此代碼")
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
          輸入表單代碼
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={surveyCode}
              onChange={(e) => setSurveyCode(e.target.value)}
              placeholder="請輸入您的表單代碼"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-300"
              aria-label="Survey Code"
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-101"
          >
            確認提交
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          請輸入您收到的唯一表單代碼
        </p>
      </div>
    </div>
  );
}
