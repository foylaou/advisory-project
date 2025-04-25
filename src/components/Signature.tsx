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

// 壓縮質量設定為 0.5


const SignatureComponent = forwardRef<SignatureComponentHandle, SignatureComponentProps>(
  ({ onSignatureChange }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const modalSigCanvas = useRef<SignatureCanvas>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasLoaded, setCanvasLoaded] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isIOS, setIsIOS] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [tempSignature, setTempSignature] = useState<string | null>(null);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    // 將內部方法暴露給父組件
    useImperativeHandle(ref, () => ({
      // 清除簽名
      clear: () => {
        if (sigCanvas.current) {
          sigCanvas.current.clear();
          setIsEmpty(true);
          setTempSignature(null);
          if (onSignatureChange) {
            onSignatureChange(true);
          }
        }
      },
      // 獲取簽名的 Base64 數據 - 使用 PNG 格式避免黑色背景問題
      toDataURL: () => {
        if (sigCanvas.current) {
          if (isIOS && tempSignature) {
            // 使用已保存的臨時簽名
            return tempSignature;
          }

          // 如果簽名是空的，返回空字符串
          if (sigCanvas.current.isEmpty()) {
            return "";
          }

          // 使用無損 PNG 格式，避免背景變黑問題
          return sigCanvas.current.toDataURL('image/png');
        }
        return null;
      },
      // 檢查簽名是否為空
      isEmpty: () => {
        return sigCanvas.current ? sigCanvas.current.isEmpty() : true;
      }
    }));

    // 處理簽名圖像以保持透明背景
    const processSignature = (canvas: SignatureCanvas): string => {
      try {
        // 如果簽名是空的，直接返回空字符串
        if (canvas.isEmpty()) {
          return "";
        }

        // 獲取原始簽名數據 - 使用 PNG 格式保持透明背景
        return canvas.toDataURL('image/png');
      } catch (error) {
        console.error("處理簽名時發生錯誤:", error);
        return "";
      }
    };

    // 檢測 iOS 設備
    useEffect(() => {
      const checkIsIOS = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
      };
      setIsIOS(checkIsIOS());
    }, []);

    // 解決水合(hydration)問題的 useEffect
    useEffect(() => {
      setCanvasLoaded(true);
    }, []);

    // 檢測屏幕方向
    useEffect(() => {
      const checkOrientation = () => {
        if (window.matchMedia("(orientation: portrait)").matches) {
          setOrientation('portrait');
        } else {
          setOrientation('landscape');
        }
      };

      // 初始檢測
      checkOrientation();

      // 監聽方向變化
      const mediaQuery = window.matchMedia("(orientation: portrait)");

      // 使用正確的事件監聽方法 (兼容舊版和新版瀏覽器)
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', checkOrientation);
      } else {
        // 舊版瀏覽器支持
        mediaQuery.addListener(checkOrientation);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', checkOrientation);
        } else {
          // 舊版瀏覽器支持
          mediaQuery.removeListener(checkOrientation);
        }
      };
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
      };

      // 立即調整大小
      resizeCanvas();

      // 監聽視窗大小變化
      window.addEventListener('resize', resizeCanvas);

      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }, [canvasLoaded]);

    // 當非 iOS 設備簽名變化時的處理函數
    const handleSignatureChange = () => {
      if (sigCanvas.current) {
        const newIsEmpty = sigCanvas.current.isEmpty();
        setIsEmpty(newIsEmpty);

        if (onSignatureChange) {
          onSignatureChange(newIsEmpty);
        }
      }
    };

    // 打開模態簽名視窗
    const openSignatureModal = () => {
      if (isIOS) {
        setShowModal(true);

        // 調整模態框內的畫布大小
        setTimeout(() => {
          if (modalSigCanvas.current && tempSignature && tempSignature.length > 0) {
            // 如果有臨時簽名數據，重新繪製
            const img = new Image();
            img.onload = () => {
              if (modalSigCanvas.current) {
                const canvas = modalSigCanvas.current;
                const getCanvasMethod = (canvas as unknown as { getCanvas: () => HTMLCanvasElement }).getCanvas;
                if (getCanvasMethod) {
                  const canvasEl = getCanvasMethod();
                  const ctx = canvasEl.getContext("2d");
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
                  }
                }
              }
            };
            img.src = tempSignature;
          }
        }, 100);
      }
    };

    // 從模態視窗保存簽名 - 修復版
    const saveSignatureFromModal = () => {
      if (modalSigCanvas.current) {
        try {
          // 檢查簽名是否為空
          const isSignatureEmpty = modalSigCanvas.current.isEmpty();
          if (isSignatureEmpty) {
            console.log("簽名為空，不保存");
            setShowModal(false);
            return;
          }

          // 從模態視窗獲取簽名並處理
          const dataURL = processSignature(modalSigCanvas.current);
          if (!dataURL) {
            console.error("無法獲取簽名數據");
            return;
          }

          console.log("簽名處理完成");
          setTempSignature(dataURL);

          // 更新簽名狀態
          setIsEmpty(false);
          if (onSignatureChange) {
            onSignatureChange(false);
          }

          // 將簽名應用到主畫布 (在 iOS 模式中，主畫布是隱藏的，但仍需要保持數據一致性)
          if (sigCanvas.current) {
            // 清除主畫布
            sigCanvas.current.clear();

            // 在主畫布上繪製模態視窗中的簽名
            const img = new Image();
            img.onload = () => {
              if (sigCanvas.current) {
                const canvas = sigCanvas.current;
                const getCanvasMethod = (canvas as unknown as { getCanvas: () => HTMLCanvasElement }).getCanvas;
                if (getCanvasMethod) {
                  const canvasEl = getCanvasMethod();
                  const ctx = canvasEl.getContext("2d");
                  if (ctx) {
                    // 使用原始數據直接繪製
                    ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
                  }
                }
              }
            };
            img.src = dataURL;
          }

          setShowModal(false);
        } catch (error) {
          console.error("保存簽名時發生錯誤:", error);
          alert("保存簽名失敗，請重試");
        }
      }
    };

    // 關閉模態視窗而不保存
    const cancelModal = () => {
      setShowModal(false);
    };

    // 清除模態視窗中的簽名
    const clearModalSignature = () => {
      if (modalSigCanvas.current) {
        modalSigCanvas.current.clear();
      }
    };

    // 清除主視窗的簽名
    const clear = () => {
      if (sigCanvas.current) {
        sigCanvas.current.clear();
        setIsEmpty(true);
        setTempSignature(null);
        if (onSignatureChange) {
          onSignatureChange(true);
        }
      }
    };

    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-4">
          <p className="text-sm text-base-content/70 mb-2">
            請{isIOS ? "點擊下方區域" : "使用滑鼠或觸控裝置在下方區域"}簽署您的姓名
          </p>

          {/* 主簽名區域 */}
          <div
            ref={containerRef}
            className="border-2 border-base-300 rounded-lg bg-white mb-4 shadow-inner"
            style={{
              height: "160px",
              position: "relative",
              overflow: "hidden"
            }}
            onClick={isIOS ? openSignatureModal : undefined}
          >
            {/* 非 iOS 設備顯示正常簽名區域 */}
            {canvasLoaded && !isIOS && (
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
                    cursor: 'crosshair',
                    userSelect: 'none'
                  },
                  className: "signature-canvas"
                }}
                dotSize={2}
                minWidth={1.5}
                maxWidth={3}
                backgroundColor="rgba(255, 255, 255, 0)" // 透明背景
                onEnd={handleSignatureChange}
              />
            )}

            {/* iOS 設備顯示預覽和提示 */}
            {canvasLoaded && isIOS && (
              <>
                {tempSignature ? (
                  <img
                    src={tempSignature}
                    alt="您的簽名"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-base-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <p className="mt-2 text-base-content/70">點擊此區域進行簽名</p>
                    </div>
                  </div>
                )}

                {/* 隱藏的簽名畫布，用於存儲數據 */}
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
                      visibility: 'hidden'
                    }
                  }}
                  backgroundColor="rgba(255, 255, 255, 0)" // 透明背景
                />
              </>
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

            {isIOS && (
              <button
                type="button"
                onClick={openSignatureModal}
                className="btn btn-sm btn-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {tempSignature ? "修改簽名" : "進行簽名"}
              </button>
            )}
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

        {/* 模態簽名視窗 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div
              className={`bg-white rounded-lg shadow-xl ${orientation === 'landscape' ? 'w-full h-auto max-h-[90vh]' : 'w-[95%] max-w-md'}`}
              style={{
                maxWidth: orientation === 'landscape' ? '95vw' : '28rem',
              }}
            >
              <div className="p-3 border-b border-base-200 flex justify-between items-center">
                <h3 className="text-lg font-bold">請在下方區域簽署您的姓名</h3>
                <button
                  onClick={cancelModal}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>

              <div className="p-4">
                <div
                  className="border-2 border-base-300 rounded-lg bg-white mb-4"
                  style={{
                    height: orientation === 'landscape' ? '50vh' : '300px',
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  <SignatureCanvas
                    ref={modalSigCanvas}
                    penColor="black"
                    canvasProps={{
                      style: {
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        touchAction: 'none'
                      },
                      className: "signature-modal-canvas"
                    }}
                    dotSize={2}
                    minWidth={1.5}
                    maxWidth={3}
                    backgroundColor="rgba(255, 255, 255, 0)" // 透明背景
                  />
                </div>

                <div className="flex flex-wrap gap-2 justify-between">
                  <button
                    className="btn btn-outline"
                    onClick={clearModalSignature}
                  >
                    清除
                  </button>

                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost"
                      onClick={cancelModal}
                    >
                      取消
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={saveSignatureFromModal}
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SignatureComponent.displayName = 'SignatureComponent';

export default SignatureComponent;
