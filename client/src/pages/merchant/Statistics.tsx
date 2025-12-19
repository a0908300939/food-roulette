import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { TrendingUp, Ticket, Award, Calendar } from "lucide-react";
import { useState } from "react";

type DateRange = '7' | '30' | '90';

export default function MerchantStatistics() {
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');

  const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const { data: restaurants } = trpc.merchant.getMyRestaurants.useQuery();
  const { data: overview } = trpc.merchant.getOverviewStatistics.useQuery({
    startDate,
    endDate,
  });
  const { data: ranking } = trpc.merchant.getRanking.useQuery({
    startDate,
    endDate,
    metric: 'totalSpins',
  });
  const { data: restaurantStats } = trpc.merchant.getRestaurantStatistics.useQuery(
    {
      restaurantId: parseInt(selectedRestaurantId),
      startDate,
      endDate,
    },
    { enabled: selectedRestaurantId !== 'all' }
  );

  const dateRangeOptions = [
    { value: '7', label: '近 7 天' },
    { value: '30', label: '近 30 天' },
    { value: '90', label: '近 90 天' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">數據統計</h1>
          <p className="text-muted-foreground mt-2">
            查看您的店鋪表現和數據分析
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有店鋪</SelectItem>
              {restaurants?.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 總覽統計 */}
      {selectedRestaurantId === 'all' && overview && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  總被抽中次數
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalSpins}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  所有店鋪合計
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  優惠券發放
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalCouponsIssued}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  總發放數量
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  優惠券兌換
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalCouponsRedeemed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  總兌換數量
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  平均兌換率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.averageRedemptionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  兌換率表現
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 各店鋪表現 */}
          <Card>
            <CardHeader>
              <CardTitle>各店鋪表現</CardTitle>
              <CardDescription>
                {dateRangeOptions.find(o => o.value === dateRange)?.label}的詳細數據
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.restaurants.map((stat) => {
                  const restaurant = restaurants?.find(r => r.id === stat.restaurantId);
                  if (!restaurant) return null;

                  return (
                    <div key={stat.restaurantId} className="p-4 border rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{restaurant.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRestaurantId(stat.restaurantId.toString())}
                        >
                          查看詳情
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">被抽中</p>
                          <p className="text-lg font-semibold">{stat.totalSpins}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">優惠券發放</p>
                          <p className="text-lg font-semibold">{stat.couponsIssued}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">優惠券兌換</p>
                          <p className="text-lg font-semibold">{stat.couponsRedeemed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">兌換率</p>
                          <p className="text-lg font-semibold">{stat.redemptionRate}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 單一店鋪詳細統計 */}
      {selectedRestaurantId !== 'all' && restaurantStats && (
        <Card>
          <CardHeader>
            <CardTitle>
              {restaurants?.find(r => r.id === parseInt(selectedRestaurantId))?.name} - 詳細統計
            </CardTitle>
            <CardDescription>
              {dateRangeOptions.find(o => o.value === dateRange)?.label}的每日數據
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {restaurantStats.map((stat) => (
                <div key={stat.date} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{stat.date}</span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">被抽中: </span>
                      <span className="font-semibold">{stat.totalSpins}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">早餐: </span>
                      <span>{stat.breakfastSpins}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">午餐: </span>
                      <span>{stat.lunchSpins}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">晚餐: </span>
                      <span>{stat.dinnerSpins}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">消夜: </span>
                      <span>{stat.lateNightSpins}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">兌換率: </span>
                      <span className="font-semibold">{stat.redemptionRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
              {restaurantStats.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  此期間沒有數據
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 排名資訊 */}
      {ranking && ranking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              店鋪排名
            </CardTitle>
            <CardDescription>
              根據被抽中次數排名（{dateRangeOptions.find(o => o.value === dateRange)?.label}）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ranking.slice(0, 20).map((item) => (
                <div
                  key={item.restaurantId}
                  className={`flex items-center justify-between p-3 border rounded ${
                    item.isMine ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center">
                      {item.rank <= 3 ? (
                        <Badge variant={item.rank === 1 ? 'default' : 'secondary'}>
                          #{item.rank}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">#{item.rank}</span>
                      )}
                    </div>
                    <span className={item.isMine ? 'font-semibold' : ''}>
                      {item.restaurantName}
                      {item.isMine && (
                        <Badge variant="outline" className="ml-2">我的店鋪</Badge>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      <span className="font-semibold">{item.totalSpins}</span> 次
                    </div>
                    <div>
                      <Ticket className="inline h-3 w-3 mr-1" />
                      <span>{item.couponsRedeemed}</span> 張
                    </div>
                    <div>
                      兌換率: <span className="font-semibold">{item.redemptionRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
