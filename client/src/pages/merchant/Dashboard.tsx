import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, Ticket, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface MerchantProfile {
  id: number;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
  restaurants: Restaurant[];
}

interface Restaurant {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
}

interface OverviewStatistics {
  totalRestaurants: number;
  totalSpins: number;
  totalCouponsIssued: number;
  totalCouponsRedeemed: number;
  averageRedemptionRate: number;
  totalUniqueUsers: number;
}

export default function MerchantDashboard() {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [statistics, setStatistics] = useState<OverviewStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  // Using toast from sonner
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadProfile();
    loadStatistics();
  }, []);

  const loadProfile = async () => {
    try {
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch("/api/merchant/profile", {
        headers: {
          "x-user-openid": openId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast.error("載入失敗：無法載入商家資料");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const openId = localStorage.getItem("userOpenId");
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const response = await fetch(
        `/api/merchant/overview-statistics?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            "x-user-openid": openId || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load statistics");
      }

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Failed to load statistics:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">無法載入商家資料</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 歡迎訊息 */}
      <Card>
        <CardHeader>
          <CardTitle>歡迎回來，{profile.name}！</CardTitle>
          <CardDescription>
            您目前管理 {profile.restaurants.length} 家店鋪
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 統計卡片 */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">管理店鋪</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalRestaurants}</div>
              <p className="text-xs text-muted-foreground">家店鋪</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">被抽中次數</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalSpins}</div>
              <p className="text-xs text-muted-foreground">近 30 天</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">優惠券發放</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalCouponsIssued}</div>
              <p className="text-xs text-muted-foreground">
                已兌換 {statistics.totalCouponsRedeemed} 張 ({statistics.averageRedemptionRate}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">不重複使用者</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUniqueUsers}</div>
              <p className="text-xs text-muted-foreground">近 30 天</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 我的店鋪 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>我的店鋪</CardTitle>
              <CardDescription>您管理的所有店鋪</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setLocation("/merchant?tab=restaurants")}>
              查看全部
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile.restaurants.slice(0, 6).map((restaurant) => (
              <div
                key={restaurant.id}
                className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-medium">{restaurant.name}</h3>
                  <p className="text-sm text-gray-500">{restaurant.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  {restaurant.isActive ? (
                    <Badge className="bg-green-500">營業中</Badge>
                  ) : (
                    <Badge className="bg-gray-500">已停用</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/merchant/restaurant/${restaurant.id}`)}
                  >
                    管理
                  </Button>
                </div>
              </div>
            ))}

            {profile.restaurants.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                尚未綁定任何店鋪，請聯絡管理員
              </div>
            )}

            {profile.restaurants.length > 6 && (
              <div className="text-center pt-4">
                <Button variant="link" onClick={() => setLocation("/merchant?tab=restaurants")}>
                  查看所有 {profile.restaurants.length} 家店鋪 →
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用功能快速入口</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => setLocation("/merchant?tab=restaurants")}
            >
              <Store className="h-6 w-6" />
              <span>管理店鋪</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => setLocation("/merchant?tab=statistics")}
            >
              <BarChart3 className="h-6 w-6" />
              <span>查看數據</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 權限說明 */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">權限說明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-700">
          <ul className="list-disc list-inside space-y-1">
            <li>您可以編輯自己店鋪的基本資訊（名稱、地址、電話、營業時間等）</li>
            <li>您可以查看自己店鋪的數據統計（被抽中次數、優惠券使用等）</li>
            <li>您<strong>無法調整轉盤機率</strong>，此功能僅限管理員</li>
            <li>您<strong>無法查看其他商家</strong>的店鋪資料</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
