'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const surveyIdRef = useRef<HTMLInputElement>(null);
  const responseIdRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const surveyId = surveyIdRef.current?.value;
    const responseId = responseIdRef.current?.value;

    if (surveyId && responseId) {
      router.push(`/chemical-compliance-review/${surveyId}/${responseId}`);
    } else {
      setLoading(false);
      alert('請輸入完整資訊');
    }
  };

  return (
    <div className="daisy-container mx-auto p-4 min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="daisy-panel w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <div className="daisy-panel-header">
          <h1 className="text-2xl font-bold text-center text-primary mb-6">測試用頁面</h1>
        </div>

        <div className="daisy-panel-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="daisy-form-item">
              <label className="daisy-label block text-sm font-medium text-gray-700 mb-1">
                表單 ID
              </label>
              <input
                type="text"
                placeholder="請輸入表單ID"
                name="surveyId"
                required
                ref={surveyIdRef}
                className="daisy-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition duration-200"
              />
            </div>

            <div className="daisy-form-item">
              <label className="daisy-label block text-sm font-medium text-gray-700 mb-1">
                回應 ID
              </label>
              <input
                type="text"
                placeholder="請輸入回應ID"
                name="responseId"
                required
                ref={responseIdRef}
                className="daisy-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition duration-200"
              />
            </div>

            <div className="daisy-form-item mt-6">
              <button
                className="daisy-btn daisy-btn-primary w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition duration-200 flex items-center justify-center"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="daisy-loading daisy-loading-spinner mr-2"></span>
                    處理中...
                  </>
                ) : '前往頁面'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
