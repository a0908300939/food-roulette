import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, Ticket, Users, Award } from "lucide-react";

interface Restaurant {
  id: number;
  name: string;
}

interface OverviewStatistics {
  totalRestaurants: number;
  totalSpins: number;
  totalCouponsIssued: number;
  totalCouponsRedeemed: number;
  averageRedemptionRate: number;
  totalUniqueUsers: number;
}

interface RestaurantStatistic {
  id: number;
  restaurantId: number;
  date: string;
  totalSpins: number;
  breakfastSpins: number;
  lunchSpins: number;
  afternoonTeaSpins: number;
  dinnerSpins: number;
  lateNightSpins: number;
  couponsIssued: number;
  couponsRedeemed: number;
  redemptionRate: number;
  uniqueUsers: number;
}

interface Ranking {
  rank: number;
  restaurantId: number;
  restaurantName: string;
  totalSpins: number;
  couponsIssued: number;
  couponsRedeemed: number;
  redemptionRate: number;
}

export default function MerchantStatistics() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [overviewStats, setOverviewStats] = useState<OverviewStatistics | null>(null);
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStatistic[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  // Using toast from sonner

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (restaurants.length > 0) {
      loadStatistics();
    }
  }, [dateRange, selectedRestaurant, restaurants]);

  const loadRestaurants = async () => {
    try {
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch("/api/merchant/restaurants", {
        headers: {
          "x-user-openid": openId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load restaurants");
      }

      const data = await response.json();
      setRestaurants(data);
    } catch (error) {
      console.error("Failed to load restaurants:", error);
        toast.error("載入失敗：無法載入店鋪列表");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const openId = localStorage.getItem("userOpenId");
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // 載入總覽統計
      const overviewResponse = await fetch(
        `/api/merchant/overview-statistics?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            "x-user-openid": openId || "",
          },
        }
      );

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setOverviewStats(overviewData);
      }

      // 載入單一店鋪統計（如果選擇了特定店鋪）
      if (selectedRestaurant !== "all") {
        const statsResponse = await fetch(
          `/api/merchant/restaurants/${selectedRestaurant}/statistics?startDate=${startDate}&endDate=${endDate}`,
          {
            headers: {
              "x-user-openid": openId || "",
            },
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setRestaurantStats(statsData);
        }
      } else {
        setRestaurantStats([]);
      }

      // 載入排名
      const rankingsResponse = await fetch(
        `/api/merchant/rankings?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            "x-user-openid": openId || "",
          },
        }
      );

      if (rankingsResponse.ok) {
        const rankingsData = await rankingsResponse.json();
        setRankings(rankingsData);
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
        toast.error("載入失敗：無法載入統計資料");
    }
  };

  const calculateTotalStats = () => {
    if (restaurantStats.length === 0) return null;

    return restaurantStats.reduce(
      (acc, stat) => ({
        totalSpins: acc.totalSpins + stat.totalSpins,
        breakfastSpins: acc.breakfastSpins + stat.breakfastSpins,
        lunchSpins: acc.lunchSpins + stat.lunchSpins,
        afternoonTeaSpins: acc.afternoonTeaSpins + stat.afternoonTeaSpins,
        dinnerSpins: acc.dinnerSpins + stat.dinnerSpins,
        lateNightSpins: acc.lateNightSpins + stat.lateNightSpins,
        couponsIssued: acc.couponsIssued + stat.couponsIssued,
        couponsRedeemed: acc.couponsRedeemed + stat.couponsRedeemed,
        uniqueUsers: acc.uniqueUsers + stat.uniqueUsers,
      }),
      {
        totalSpins: 0,
        breakfastSpins: 0,
        lunchSpins: 0,
        afternoonTeaSpins: 0,
        dinnerSpins: 0,
        lateNightSpins: 0,
        couponsIssued: 0,
        couponsRedeemed: 0,
        uniqueUsers: 0,
      }
    );
  };

  const getMyRanking = () => {
    if (selectedRestaurant === "all" || !selectedRestaurant) return null;
    return rankings.find((r) => r.restaurantId === parseInt(selectedRestaurant));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  const totalStats = calculateTotalStats();
  const myRanking = getMyRanking();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">數據統計</h2>
          <p className="text-gray-500">查看店鋪表現和數據分析</p>
        </div>
      </div>

      {/* 篩選器 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
            <SelectTrigger>
              <SelectValue placeholder="選擇店鋪" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有店鋪（總覽）</SelectItem>
              {restaurants.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">近 7 天</SelectItem>
              <SelectItem value="30">近 30 天</SelectItem>
              <SelectItem value="90">近 90 天</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 總覽統計 */}
      {selectedRestaurant === "all" && overviewStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總被抽中次數</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.totalSpins}</div>
              <p className="text-xs text-muted-foreground">所有店鋪合計</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">優惠券發放</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.totalCouponsIssued}</div>
              <p className="text-xs text-muted-foreground">
                已兌換 {overviewStats.totalCouponsRedeemed} 張
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">兌換率</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.averageRedemptionRate}%</div>
              <p className="text-xs text-muted-foreground">平均兌換率</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">不重複使用者</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.totalUniqueUsers}</div>
              <p className="text-xs text-muted-foreground">總計</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 單一店鋪統計 */}
      {selectedRestaurant !== "all" && totalStats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">總被抽中次數</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalSpins}</div>
                <p className="text-xs text-muted-foreground">
                  {myRanking && `排名第 ${myRanking.rank} 名`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">優惠券發放</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.couponsIssued}</div>
                <p className="text-xs text-muted-foreground">
                  已兌換 {totalStats.couponsRedeemed} 張
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">兌換率</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalStats.couponsIssued > 0
                    ? Math.round((totalStats.couponsRedeemed / totalStats.couponsIssued) * 100)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">優惠券兌換率</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">不重複使用者</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.uniqueUsers}</div>
                <p className="text-xs text-muted-foreground">總計</p>
              </CardContent>
            </Card>
          </div>

          {/* 時段分析 */}
          <Card>
            <CardHeader>
              <CardTitle>時段分析</CardTitle>
              <CardDescription>各時段被抽中次數統計</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">早餐（06:00-10:00）</span>
                  <span className="text-sm font-bold">{totalStats.breakfastSpins} 次</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">午餐（10:00-14:00）</span>
                  <span className="text-sm font-bold">{totalStats.lunchSpins} 次</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">下午茶（14:00-17:00）</span>
                  <span className="text-sm font-bold">{totalStats.afternoonTeaSpins} 次</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">晚餐（17:00-21:00）</span>
                  <span className="text-sm font-bold">{totalStats.dinnerSpins} 次</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">消夜（21:00-06:00）</span>
                  <span className="text-sm font-bold">{totalStats.lateNightSpins} 次</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 排名 */}
      <Card>
        <CardHeader>
          <CardTitle>店鋪排名</CardTitle>
          <CardDescription>所有店鋪的被抽中次數排名（前 20 名）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rankings.slice(0, 20).map((ranking) => {
              const isMyRestaurant =
                selectedRestaurant !== "all" && ranking.restaurantId === parseInt(selectedRestaurant);
              return (
                <div
                  key={ranking.restaurantId}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    isMyRestaurant ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-bold ${
                        ranking.rank <= 3 ? "text-yellow-600" : "text-gray-600"
                      }`}
                    >
                      #{ranking.rank}
                    </span>
                    <div>
                      <span className="font-medium">{ranking.restaurantName}</span>
                      {isMyRestaurant && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">（我的店鋪）</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{ranking.totalSpins} 次</div>
                    <div className="text-xs text-gray-500">
                      兌換率 {ranking.redemptionRate}%
                    </div>
                  </div>
                </div>
              );
            })}

            {rankings.length === 0 && (
              <div className="text-center py-8 text-gray-500">暫無排名資料</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
