"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureComponentProps {
  onSignatureChange?: (isEmpty: boolean) => void;
}

// 定義暴露給父組件的方法
export interface SignatureComponentHandle {
  clear: () => void;
  toDataURL: () => string | null;
  isEmpty: () => boolean;
}

const SignatureComponent = forwardRef<SignatureComponentHandle, SignatureComponentProps>(
  ({ onSignatureChange }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasLoaded, setCanvasLoaded] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    // 將內部方法暴露給父組件
    useImperativeHandle(ref, () => ({
      // 清除簽名
      clear: () => {
        if (sigCanvas.current) {
          sigCanvas.current.clear();
          setIsEmpty(true);
          if (onSignatureChange) {
            onSignatureChange(true);
          }
        }
      },
      // 獲取簽名的 Base64 數據
      toDataURL: () => {
        if (sigCanvas.current) {
          return sigCanvas.current.toDataURL();
        }
        return null;
      },
      // 檢查簽名是否為空
      isEmpty: () => {
        return sigCanvas.current ? sigCanvas.current.isEmpty() : true;
      }
    }));

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
          <p className="text-sm text-base-content/70 mb-2">
            請使用滑鼠或觸控裝置在下方區域簽署您的姓名
          </p>

          <div
            ref={containerRef}
            className="border-2 border-base-300 rounded-lg bg-white mb-4 shadow-inner"
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
              className="btn btn-sm btn-outline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              清除簽名
            </button>
          </div>
        </div>

        {isEmpty && (
          <div className="alert alert-warning py-2 px-4 text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            請先完成簽名
          </div>
        )}
      </div>
    );
  }
);

SignatureComponent.displayName = 'SignatureComponent';

export default SignatureComponent;
