import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, Users, Ticket, Store } from "lucide-react";

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = trpc.analytics.overview.useQuery();

  if (isLoading) {
    return <div className="text-center py-8">載入中...</div>;
  }

  const periodLabels: Record<string, string> = {
    breakfast: "早餐",
    lunch: "午餐",
    afternoon_tea: "下午茶",
    dinner: "晚餐",
    late_night: "消夜",
  };

  return (
    <div className="space-y-6">
      {/* 總覽卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總轉盤次數</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalSpins || 0}</div>
            <p className="text-xs text-muted-foreground">使用者使用轉盤的總次數</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總兌換次數</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalRedemptions || 0}</div>
            <p className="text-xs text-muted-foreground">優惠券實際兌換次數</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">兌換率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.redemptionRate ? `${analytics.redemptionRate.toFixed(1)}%` : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">轉盤後實際到店兌換的比例</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">合作店家</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeRestaurants || 0}</div>
            <p className="text-xs text-muted-foreground">
              啟用中 / 總數：{analytics?.activeRestaurants || 0} / {analytics?.totalRestaurants || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 時段統計 */}
      <Card>
        <CardHeader>
          <CardTitle>各時段使用統計</CardTitle>
          <CardDescription>查看不同用餐時段的轉盤使用次數</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.periodStats && Object.entries(analytics.periodStats).length > 0 ? (
              Object.entries(analytics.periodStats).map(([period, count]) => {
                const total = analytics.totalSpins || 1;
                const percentage = ((count as number) / total) * 100;
                return (
                  <div key={period} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{periodLabels[period] || period}</span>
                      <span className="text-muted-foreground">
                        {count} 次 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                尚無使用數據
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 店家統計 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>店家抽出次數排行</CardTitle>
            <CardDescription>最常被轉盤抽中的店家</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.restaurantSpinCount && Object.keys(analytics.restaurantSpinCount).length > 0 ? (
                Object.entries(analytics.restaurantSpinCount)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([restaurantId, count]) => (
                    <div key={restaurantId} className="flex items-center justify-between">
                      <span className="text-sm">店家 ID: {restaurantId}</span>
                      <span className="text-sm font-medium">{count as number} 次</span>
                    </div>
                  ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  尚無數據
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>店家兌換次數排行</CardTitle>
            <CardDescription>優惠券兌換次數最多的店家</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.restaurantRedemptionCount && Object.keys(analytics.restaurantRedemptionCount).length > 0 ? (
                Object.entries(analytics.restaurantRedemptionCount)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([restaurantId, count]) => (
                    <div key={restaurantId} className="flex items-center justify-between">
                      <span className="text-sm">店家 ID: {restaurantId}</span>
                      <span className="text-sm font-medium">{count as number} 次</span>
                    </div>
                  ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  尚無數據
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
