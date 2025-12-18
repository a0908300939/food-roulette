import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useState, useRef, useEffect } from "react";

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
  coupon?: Coupon | null;
  coupons?: Coupon[];  // 支持多張優惠券
}



type WheelVersion = 'v1' | 'v2' | 'v3' | 'canvas' | 'rainbow' | 'redwhite' | 'colorful';

interface WheelSlice {
  restaurantId: number;
  restaurant: Restaurant;
  coupon: Coupon | null;
}

interface SpinWheelProps {
  restaurants: Restaurant[];
  wheelData?: WheelSlice[];  // 預先分配的轉盤資料
  onResult: (restaurant: Restaurant, selectedCoupon?: Coupon | null, spinHistoryId?: number) => void;
  onSpin?: (selectedIndex: number, restaurantId: number, couponId: number | null) => Promise<{ restaurant: Restaurant; coupon: any; spinHistoryId: number }>; // 抽獎回調，傳入前端決定的位置、店家ID、優惠券ID
  wheelVersion?: WheelVersion; // 轉盤版本
}

const WHEEL_VERSION_IMAGES: Record<WheelVersion, string | null> = {
  v1: '/wheels/wheel-v1.png',
  v2: '/wheels/wheel-v2.png',
  v3: '/wheels/wheel-v3.png',
  canvas: null,
  rainbow: null, // 彩虹漸層程式繪製
  redwhite: null, // 紅白程式繪製
  colorful: null, // 多彩程式繪製
};

export default function SpinWheel({ restaurants, wheelData, onResult, onSpin, wheelVersion = 'canvas' }: SpinWheelProps) {
  const wheelImageUrl = WHEEL_VERSION_IMAGES[wheelVersion];
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // 使用後端預先分配的轉盤資料
  const wheelSlices = wheelData || [];
  
  useEffect(() => {
    if (wheelSlices.length > 0) {
      console.log('[SpinWheel] 使用後端預先分配的轉盤資料，共', wheelSlices.length, '個扇形');
      wheelSlices.forEach((slice, i) => {
        console.log(`  扇形 ${i}:`, slice.restaurant.name, '→', slice.coupon?.title || '無優惠券');
      });
    }
  }, [wheelSlices]);

  // 初始化音效
  useEffect(() => {
    spinSoundRef.current = new Audio('/spin-sound.mp3');
    winSoundRef.current = new Audio('/win-sound.mp3');
    
    // 預載音效
    spinSoundRef.current.load();
    winSoundRef.current.load();
  }, []);

  // 繪製轉盤
  useEffect(() => {
    drawWheel();
  }, [wheelSlices, wheelVersion]);

  const getColors = () => {
    if (wheelVersion === 'rainbow') {
      return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    } else if (wheelVersion === 'redwhite') {
      return ['#FF4444', '#FFFFFF', '#FF4444', '#FFFFFF', '#FF4444', '#FFFFFF'];
    } else if (wheelVersion === 'colorful') {
      return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    } else {
      return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    }
  };

  const getTextColor = (bgColor: string) => {
    // 簡單的亮度計算
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
  };

  // 繪製星星
  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) => {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;

      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const handleSpin = async () => {
    if (isSpinning || wheelSlices.length === 0) return;
    if (!onSpin) {
      console.error('[SpinWheel] onSpin callback 未提供');
      return;
    }

    setIsSpinning(true);
    
    // 播放轉盤音效
    if (spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(err => console.log('音效播放失敗:', err));
    }
    
    try {
      // ✨ 新邏輯：隨機生成旋轉角度（不預先決定結果）
      const spins = 5 + Math.random() * 3; // 隨機旋轉 5-8 圈
      const randomAngle = Math.random() * 360; // 隨機停止角度 0-360°
      const finalRotation = rotation + spins * 360 + randomAngle;
      
      console.log('[SpinWheel] 開始隨機旋轉:');
      console.log('  旋轉圈數:', spins);
      console.log('  隨機角度:', randomAngle);
      console.log('  最終角度:', finalRotation);

      setRotation(finalRotation);

      // 動畫結束後，計算指針位置，再呼叫後端 API
      setTimeout(async () => {
        // 計算最終角度（標準化到 0-360°）
        const normalizedAngle = finalRotation % 360;
        
        // 計算指針指向的扇形索引
        // 指針固定在 12 點鐘方向（0°），轉盤旋轉
        // 轉盤從 -90° 開始繪製（index 0 在 12 點鐘方向）
        // 轉盤順時針旋轉，所以需要「反向」計算：用 360° 減去旋轉角度
        const sliceAngle = 360 / wheelSlices.length;
        const adjustedAngle = (360 - normalizedAngle) % 360;
        const selectedIndex = Math.floor(adjustedAngle / sliceAngle) % wheelSlices.length;
        
        console.log('[SpinWheel] 轉盤停止，計算指針位置:');
        console.log('  normalizedAngle:', normalizedAngle);
        console.log('  adjustedAngle:', adjustedAngle);
        console.log('  sliceAngle:', sliceAngle);
        console.log('  selectedIndex:', selectedIndex);
        
        // 取得指針指向的扇形資料
        const selectedSlice = wheelSlices[selectedIndex];
        const selectedRestaurant = selectedSlice.restaurant;
        const selectedCoupon = selectedSlice.coupon;
        
        console.log('[SpinWheel] 指針指向:');
        console.log('  店家:', selectedRestaurant.name);
        console.log('  優惠券:', selectedCoupon?.title || '無優惠券');
        
        // 呼叫後端 API 記錄抽獎結果
        const result = await onSpin(selectedIndex, selectedRestaurant.id, selectedCoupon?.id || null);
        const { restaurant: confirmedRestaurant, coupon: confirmedCoupon, spinHistoryId } = result;
        
        console.log('[SpinWheel] 後端確認結果:');
        console.log('  店家:', confirmedRestaurant.name);
        console.log('  優惠券:', confirmedCoupon?.title || '無優惠券');
        console.log('  spinHistoryId:', spinHistoryId);
        
        setSelectedCoupon(confirmedCoupon);
        setIsSpinning(false);
        
        // 停止轉盤音效，播放中獎音效
        if (spinSoundRef.current) {
          spinSoundRef.current.pause();
          spinSoundRef.current.currentTime = 0;
        }
        if (winSoundRef.current) {
          winSoundRef.current.currentTime = 0;
          winSoundRef.current.play().catch(err => console.log('音效播放失敗:', err));
        }
        
        // 傳回後端確認的結果
        onResult(confirmedRestaurant, confirmedCoupon, spinHistoryId);
      }, 4000);
    } catch (error) {
      console.error('[SpinWheel] 抽獎失敗:', error);
      setIsSpinning(false);
      
      // 停止轉盤音效
      if (spinSoundRef.current) {
        spinSoundRef.current.pause();
        spinSoundRef.current.currentTime = 0;
      }
      
      throw error;
    }
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = getColors();
    const sliceAngle = (2 * Math.PI) / wheelSlices.length;
    
    // Canvas 繪製從 0° (3點鐘方向) 開始，我們要讓 index 0 從 12 點鐘方向開始
    // 所以需要減去 90° (Math.PI / 2)
    const startOffset = -Math.PI / 2;

    // 繪製扇形
    wheelSlices.forEach((slice, index) => {
      const restaurant = slice.restaurant;
      const coupon = slice.coupon;
      const startAngle = index * sliceAngle + startOffset;
      const endAngle = (index + 1) * sliceAngle + startOffset;

      // 繪製扇形
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 繪製文字
      const textAngle = startAngle + sliceAngle / 2;
      const textRadius = radius * 0.65;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(textAngle);

      const bgColor = colors[index % colors.length];
      const textColor = getTextColor(bgColor);
      ctx.fillStyle = textColor;
      
      // 文字描邊（增強可讀性）
      ctx.strokeStyle = textColor === '#FFFFFF' ? '#000000' : '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 顯示預先分配的優惠券標題；如果沒有優惠券，顯示店家名稱
      const displayText = coupon?.title || restaurant.name;
      
      // 計算最大文字寬度（扇形內可用空間）
      const maxWidth = radius * 0.5; // 限制文字寬度在扇形的 50% 半徑內
      
      // 根據文字長度決定字體大小和是否換行
      let fontSize = 14;
      let lines: string[] = [displayText];
      
      // 如果文字太長，嘗試分成兩行
      if (displayText.length > 8) {
        // 嘗試在中間位置分割文字
        const midPoint = Math.ceil(displayText.length / 2);
        const line1 = displayText.substring(0, midPoint);
        const line2 = displayText.substring(midPoint);
        lines = [line1, line2];
        fontSize = 12; // 兩行時使用較小字體
      }
      
      // 如果文字仍然太長，進一步縮小字體
      if (displayText.length > 12) {
        fontSize = 10;
      }
      
      ctx.font = `bold ${fontSize}px 'Noto Sans TC', sans-serif`;
      
      // 繪製文字（單行或兩行）
      if (lines.length === 1) {
        // 單行文字
        ctx.strokeText(displayText, textRadius, 0);
        ctx.fillText(displayText, textRadius, 0);
      } else {
        // 兩行文字
        const lineHeight = fontSize + 2;
        const startY = -lineHeight / 2;
        
        lines.forEach((line, i) => {
          const y = startY + i * lineHeight;
          ctx.strokeText(line, textRadius, y);
          ctx.fillText(line, textRadius, y);
        });
      }
      
      ctx.restore();
    });

    // 繪製外框裝飾（在扇形之後繪製，使用環形而非實心圓）
    if (wheelVersion === 'rainbow') {
      // 黑色外框（環形）
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, true); // 內圓，反向繪製
      ctx.fillStyle = "#2C3E50";
      ctx.fill();

      // 繪製白色圓點
      const dotCount = 40;
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * 2 * Math.PI;
        const dotX = centerX + Math.cos(angle) * (radius + 4);
        const dotY = centerY + Math.sin(angle) * (radius + 4);
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
      }
    } else if (wheelVersion === 'redwhite' || wheelVersion === 'colorful') {
      // 黃色外框（環形）
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, true); // 內圓，反向繪製
      ctx.fillStyle = "#FFD700";
      ctx.fill();

      // 繪製白色圓點
      const dotCount = 40;
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * 2 * Math.PI;
        const dotX = centerX + Math.cos(angle) * (radius + 4);
        const dotY = centerY + Math.sin(angle) * (radius + 4);
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
      }
    }

    // 繪製中心圓
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 繪製中心星星
    drawStar(ctx, centerX, centerY, 5, 15, 8, '#FFD700');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 轉盤容器 */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* 指針 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-red-500"></div>
        </div>

        {/* 轉盤 */}
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-80 h-80 transition-transform duration-4000 ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>

      {/* 開始轉盤按鈕 */}
      <Button
        onClick={handleSpin}
        disabled={isSpinning}
        className="px-8 py-3 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
      >
        {isSpinning ? '轉盤中...' : '開始轉盤'}
      </Button>

      {/* 音效元素 */}
      <audio ref={spinSoundRef} src="/spin-sound.mp3" />
      <audio ref={winSoundRef} src="/win-sound.mp3" />
    </div>
  );
}
