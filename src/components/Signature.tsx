"use client";

import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureComponentProps {
  onSignatureChange?: (isEmpty: boolean) => void;
}

const SignatureComponent: React.FC<SignatureComponentProps> = ({ onSignatureChange }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // 解決水合(hydration)問題的 useEffect
  useEffect(() => {
    setCanvasLoaded(true);
  }, []);

  // 調整 canvas 大小，確保正確渲染
  useEffect(() => {
    if (!canvasLoaded || !sigCanvas.current || !containerRef.current) return;

    const resizeCanvas = () => {
      if (!sigCanvas.current || !containerRef.current) return;

      // 避免使用 any，顯式聲明 canvas 取得方法
      const canvas = sigCanvas.current;
      // 使用類型斷言來獲取 getCanvas 方法
      const getCanvasMethod = (canvas as unknown as { getCanvas: () => HTMLCanvasElement }).getCanvas;

      if (!getCanvasMethod) return;

      const canvasEl = getCanvasMethod();
      const container = containerRef.current;

      if (!container || !canvasEl) return;

      // 設置真實像素大小 (解決高DPI屏幕問題)
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvasEl.width = container.clientWidth * ratio;
      canvasEl.height = container.clientHeight * ratio;
      const ctx = canvasEl.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
      }

      // 設置顯示大小
      canvasEl.style.width = `${container.clientWidth}px`;
      canvasEl.style.height = `${container.clientHeight}px`;

      // 重新初始化簽名區域
      canvas.clear();
    };

    // 立即調整大小
    resizeCanvas();

    // 監聽視窗大小變化
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasLoaded]);

  // 處理全局觸控事件，避免滾動干擾
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      // 檢查事件是否來自我們的簽名區域
      const target = e.target as HTMLElement;

      if (!sigCanvas.current) return;

      // 使用類型斷言來獲取 getCanvas 方法
      const getCanvasMethod = (sigCanvas.current as unknown as { getCanvas: () => HTMLCanvasElement }).getCanvas;

      if (!getCanvasMethod) return;

      const canvas = getCanvasMethod();

      if (canvas && (target === canvas || canvas.contains(target))) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('touchstart', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('touchstart', preventScroll);
    };
  }, [canvasLoaded]);

  // 當簽名變化時的處理函數
  const handleSignatureChange = () => {
    if (sigCanvas.current) {
      const newIsEmpty = sigCanvas.current.isEmpty();
      setIsEmpty(newIsEmpty);

      if (onSignatureChange) {
        onSignatureChange(newIsEmpty);
      }

      // 調試信息
      console.log("簽名變化檢測", { isEmpty: newIsEmpty });
    }
  };

  // 清除簽名
  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);

      if (onSignatureChange) {
        onSignatureChange(true);
      }
    }
  };



  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">請在下方簽名</h2>
        <p className="text-sm text-gray-600 mb-2">
          請使用滑鼠或觸控裝置在下方區域簽署您的姓名
        </p>

        <div
          ref={containerRef}
          className="border border-gray-300 rounded-md bg-white mb-4"
          style={{
            height: "160px",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {canvasLoaded && (
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                style: {
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  touchAction: 'none',
                  msTouchAction: 'none',
                  cursor: 'crosshair'
                },
                className: "signature-canvas"
              }}
              dotSize={2}
              minWidth={1.5}
              maxWidth={3}
              backgroundColor="rgba(255, 255, 255, 0)"
              onEnd={handleSignatureChange}
            />
          )}
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={clear}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            清除簽名
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="text-amber-600 text-sm font-medium">
          * 請先完成簽名
        </div>
      )}
    </div>
  );
};

export default SignatureComponent;
