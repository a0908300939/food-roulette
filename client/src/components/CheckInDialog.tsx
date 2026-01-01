import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Gift, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CheckInDialog({ open, onOpenChange }: CheckInDialogProps) {
  const utils = trpc.useUtils();
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { data: checkInStatus, refetch } = trpc.checkIn.getStatus.useQuery(undefined, {
    enabled: open,
  });

  // 查詢簽到歷史記錄
  const { data: checkInHistory } = trpc.checkIn.getHistory.useQuery(
    { limit: 100 },
    { enabled: open }
  );

  const checkInMutation = trpc.checkIn.checkIn.useMutation({
    onSuccess: async (result) => {
      // 播放成功音效（如果有的話）
      playSuccessSound();
      
      // 顯示彩帶動畫
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // 顯示成功訊息
      setShowSuccess(true);
      
      if (result.rewardCoupon) {
        toast.success(`簽到成功！獲得專屬優惠券：${result.rewardCoupon.coupon.title}`);
      } else {
        toast.success(`簽到成功！連續簽到 ${result.consecutiveDays} 天`);
      }

      // 重新載入狀態
      await refetch();
      
      // 2秒後關閉對話框
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message || "簽到失敗");
    },
  });

  const playSuccessSound = () => {
    // 使用 Web Audio API 播放簡單的成功音效
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleCheckIn = async () => {
    await checkInMutation.mutateAsync();
  };

  // 生成本月日曆
  const generateCalendar = () => {
    if (!checkInStatus) return [];
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const calendar: (number | null)[] = [];
    
    // 填充月初空白
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(day);
    }
    
    return calendar;
  };

  const isCheckedIn = (day: number | null) => {
    if (!day || !checkInStatus) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // 檢查該日期是否在簽到歷史中
    if (checkInHistory && checkInHistory.length > 0) {
      for (const record of checkInHistory) {
        const recordDate = new Date(record.checkInDate);
        if (
          recordDate.getFullYear() === currentYear &&
          recordDate.getMonth() === currentMonth &&
          recordDate.getDate() === day
        ) {
          return true;
        }
      }
    }
    
    return false;
  };

  const calendar = generateCalendar();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  
  // 計算本月已簽到的天數
  const checkedInDaysThisMonth = calendar.filter(day => isCheckedIn(day)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {showSuccess ? (
          <div className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">簽到成功！</h3>
            <p className="text-muted-foreground">
              連續簽到 {checkInStatus?.consecutiveDays || 0} 天
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                每日簽到
              </DialogTitle>
              <DialogDescription>
                連續簽到 7 天可獲得專屬優惠券！
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 sm:py-4 pb-20">
              {/* 連續簽到進度 */}
              <Card>
                <CardContent className="pt-4 sm:pt-6 pb-4">
                  <div className="text-center mb-3">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">連續簽到天數</p>
                    <p className="text-3xl sm:text-4xl font-bold text-primary">
                      {checkInStatus?.consecutiveDays || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      距離獎勵還差 {Math.max(0, 7 - (checkInStatus?.consecutiveDays || 0))} 天
                    </p>
                  </div>
                  
                  {/* 進度條 */}
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((checkInStatus?.consecutiveDays || 0) / 7) * 100)}%`
                      }}
                    />
                  </div>
                  
                  {/* 里程碑標記 */}
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>0</span>
                    <span>3</span>
                    <span className="flex items-center gap-1">
                      7 <Gift className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 簽到日曆 */}
              <div>
                <p className="text-xs sm:text-sm font-medium mb-2 text-center">
                  {new Date().getFullYear()} 年 {new Date().getMonth() + 1} 月
                  <span className="text-muted-foreground text-xs ml-1">（本月已簽到 {checkedInDaysThisMonth} 天）</span>
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-0.5">
                      {day}
                    </div>
                  ))}
                  {calendar.map((day, index) => (
                    <div
                      key={index}
                      className={`aspect-square flex items-center justify-center text-xs sm:text-sm rounded-lg ${
                        day === null
                          ? ''
                          : isCheckedIn(day)
                          ? 'bg-primary text-primary-foreground font-medium'
                          : day === new Date().getDate()
                          ? 'border-2 border-primary'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 簽到按鈕 - 固定在底部 */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-2 -mx-6 px-6 pb-4 border-t">
              {checkInStatus?.hasCheckedInToday ? (
                <Button size="lg" variant="secondary" className="w-full" disabled>
                  <Gift className="h-4 w-4 mr-2" />
                  今日已簽到
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {checkInMutation.isPending ? '簽到中...' : '立即簽到'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
