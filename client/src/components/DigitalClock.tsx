import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getPrimaryMealPeriod, MEAL_PERIODS } from "@/lib/timeUtils";

interface DigitalClockProps {
  className?: string;
}

export default function DigitalClock({ className = "" }: DigitalClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mealPeriodLabel, setMealPeriodLabel] = useState("用餐");
  const [mealPeriodIcon, setMealPeriodIcon] = useState("🍴");

  useEffect(() => {
    // 初始化時段
    const updateMealPeriod = () => {
      const period = getPrimaryMealPeriod();
      if (period) {
        setMealPeriodLabel(period.name);
        setMealPeriodIcon(period.icon);
      } else {
        setMealPeriodLabel("用餐");
        setMealPeriodIcon("🍴");
      }
    };

    updateMealPeriod();

    // 每秒更新時間與時段
    const intervalId = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      updateMealPeriod();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (date: Date): string => {
    // 計算台灣時間（UTC+8）
    const utcTime = date.getTime();
    const taiwanTimeMs = utcTime + 8 * 60 * 60 * 1000;
    const taiwanHours = Math.floor((taiwanTimeMs / (60 * 60 * 1000)) % 24);
    const taiwanMinutes = Math.floor((taiwanTimeMs / (60 * 1000)) % 60);
    const taiwanSeconds = Math.floor((taiwanTimeMs / 1000) % 60);
    
    const hours = String(taiwanHours).padStart(2, "0");
    const minutes = String(taiwanMinutes).padStart(2, "0");
    const seconds = String(taiwanSeconds).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div
      className={`inline-flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 bg-white rounded-full shadow-lg ${className}`}
    >
      {/* 時鐘圖示 */}
      <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />

      {/* 數位時鐘顯示 - 大橘色數字 */}
      <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-500 tabular-nums tracking-tight">
        {formatTime(currentTime)}
      </span>

      {/* 分隔線 */}
      <div className="w-px h-6 sm:h-8 bg-gray-300" />

      {/* 時段標籤 */}
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-xl sm:text-2xl">{mealPeriodIcon}</span>
        <span className="text-sm sm:text-base font-medium text-gray-600">
          現在是 <span className="font-bold text-orange-500">{mealPeriodLabel}</span> 時段
        </span>
      </div>
    </div>
  );
}
