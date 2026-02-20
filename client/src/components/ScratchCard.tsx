import { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';

interface Coupon {
  id: number;
  title: string;
  description?: string | null;
  discountType?: string | null;
  discountValue?: string | null;
  imageUrl?: string | null;
}

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone?: string | null;
  description?: string | null;
}

interface ScratchCardProps {
  restaurant: Restaurant;
  coupon: Coupon;
  onComplete: () => void;
}

export default function ScratchCard({ restaurant, coupon, onComplete }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 設置 canvas 尺寸
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // 高解析度
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // 繪製銀色金屬塗層
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#C0C0C0');
    gradient.addColorStop(0.5, '#E8E8E8');
    gradient.addColorStop(1, '#A8A8A8');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 添加金屬質感
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const size = Math.random() * 3;
      ctx.fillRect(x, y, size, size);
    }

    // 添加文字提示
    ctx.fillStyle = '#666';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('刮開看看你的幸運！', rect.width / 2, rect.height / 2);
  }, []);

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x * scaleX, y * scaleY, 30 * scaleX, 0, Math.PI * 2);
    ctx.fill();

    // 計算刮開百分比
    checkScratchPercentage();
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) {
        transparentPixels++;
      }
    }

    const percentage = (transparentPixels / (pixels.length / 4)) * 100;
    setScratchPercentage(percentage);

    if (percentage > 50 && !isScratched) {
      setIsScratched(true);
      // 清除整個塗層
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      scratch(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      scratch(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches[0]) {
      scratch(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches[0]) {
      scratch(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = false;
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* 底層優惠券內容 */}
      <div className="relative bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-8 shadow-2xl">
        <div className="text-center text-white">
          <div className="text-3xl font-bold mb-4">{coupon.title}</div>
          <div className="text-lg mb-2">{restaurant.name}</div>
          {coupon.description && (
            <div className="text-sm opacity-90">{coupon.description}</div>
          )}
        </div>
      </div>

      {/* 刮刮樂塗層 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-2xl cursor-pointer"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 刮開後顯示按鈕 */}
      {isScratched && (
        <div className="mt-6 animate-fade-in">
          <Button
            onClick={onComplete}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg font-bold rounded-full shadow-lg"
          >
            確認兌換
          </Button>
        </div>
      )}
    </div>
  );
}
