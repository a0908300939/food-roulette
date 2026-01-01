import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Clock, Gift, Calendar } from "lucide-react";

interface SpinRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SpinRulesDialog({ open, onOpenChange }: SpinRulesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Info className="h-6 w-6 text-primary" />
            抽獎規則說明
          </DialogTitle>
          <DialogDescription>
            了解如何使用轉盤抽獎與兌換優惠券
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 抽獎次數限制 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              抽獎次數限制
            </h3>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong className="text-orange-600 dark:text-orange-400">每個用餐時段可抽獎 2 次</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                系統共分為 5 個用餐時段：
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>🌅 早餐時段：05:00 - 10:00</li>
                <li>🍱 午餐時段：11:00 - 14:00</li>
                <li>☕ 下午茶時段：14:00 - 16:00</li>
                <li>🍽️ 晚餐時段：16:00 - 21:00</li>
                <li>🌙 消夜時段：20:00 - 24:00</li>
              </ul>
              <p className="text-sm mt-2">
                <strong className="text-orange-600 dark:text-orange-400">每天最多可抽 10 次</strong>
                <span className="text-muted-foreground">（5 個時段 × 2 次）</span>
              </p>
            </div>
          </div>

          {/* 每日重置 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              每日重置
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm">
                抽獎次數於每日 <strong className="text-blue-600 dark:text-blue-400">00:00</strong> 自動重置，當天未使用的次數不會累積到隔天。
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                建議您在不同時段回訪，把握每天的抽獎機會！
              </p>
            </div>
          </div>

          {/* 優惠券使用方式 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-500" />
              優惠券使用方式
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-2">
              <ol className="text-sm space-y-2 list-decimal ml-4">
                <li>
                  <strong>轉動轉盤</strong>：點擊「開始轉盤」按鈕，系統會隨機選擇一家營業中的店家與其優惠券
                </li>
                <li>
                  <strong>查看優惠券</strong>：中獎後會顯示優惠券詳細資訊（折扣內容、使用說明、有效期限）
                </li>
                <li>
                  <strong>前往店家</strong>：點擊「立即導航」按鈕，系統會開啟 Google 地圖導航到店家位置
                </li>
                <li>
                  <strong>兌換優惠券</strong>：到店後點擊「確認兌換」按鈕，向店家出示優惠券即可享受優惠
                </li>
              </ol>
              <p className="text-sm text-muted-foreground mt-3">
                ⚠️ 注意：優惠券兌換後無法取消，請確認已到店再點擊兌換按鈕
              </p>
            </div>
          </div>

          {/* 關閉按鈕 */}
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              我知道了
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
