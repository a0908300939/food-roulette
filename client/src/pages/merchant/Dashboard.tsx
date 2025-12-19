import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Store, TrendingUp, Ticket, Users, ArrowRight, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function MerchantDashboard() {
  const { data: profile } = trpc.merchant.getProfile.useQuery();
  const { data: restaurants } = trpc.merchant.getMyRestaurants.useQuery();
  const { data: overview } = trpc.merchant.getOverviewStatistics.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const stats = [
    {
      title: "管理店鋪",
      value: restaurants?.length || 0,
      description: "總共管理的店鋪數量",
      icon: Store,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "被抽中次數",
      value: overview?.totalSpins || 0,
      description: "近 30 天",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "優惠券發放",
      value: overview?.totalCouponsIssued || 0,
      description: "近 30 天",
      icon: Ticket,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      title: "優惠券兌換",
      value: overview?.totalCouponsRedeemed || 0,
      description: `兌換率 ${overview?.averageRedemptionRate || 0}%`,
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* 歡迎訊息 */}
      <div>
        <h1 className="text-3xl font-bold">歡迎回來，{profile?.name || "商家"}！</h1>
        <p className="text-muted-foreground mt-2">
          這是您的商家管理後台，您可以在這裡管理店鋪資訊和查看數據統計
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 我的店鋪 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>我的店鋪</CardTitle>
              <CardDescription>您管理的所有店鋪</CardDescription>
            </div>
            <Link href="/merchant/restaurants">
              <Button variant="outline" size="sm">
                查看全部
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {restaurants?.slice(0, 6).map((restaurant) => (
              <Link key={restaurant.id} href={`/merchant/restaurants/${restaurant.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{restaurant.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {restaurant.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {restaurant.isActive ? "營業中" : "已停業"}
                      </span>
                      <Button variant="ghost" size="sm">
                        管理 →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {(!restaurants || restaurants.length === 0) && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                尚未綁定任何店鋪，請聯絡管理員
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">數據統計</CardTitle>
            <CardDescription>查看詳細的數據分析和趨勢</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/merchant/statistics">
              <Button className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                查看統計報表
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">優惠券管理</CardTitle>
            <CardDescription>管理所有店鋪的優惠券</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/merchant/coupons">
              <Button className="w-full" variant="outline">
                <Ticket className="mr-2 h-4 w-4" />
                管理優惠券
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 最近 30 天趨勢（簡化版） */}
      {overview && overview.restaurants && overview.restaurants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>店鋪表現（近 30 天）</CardTitle>
            <CardDescription>各店鋪的被抽中次數和優惠券兌換情況</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.restaurants.map((stat) => {
                const restaurant = restaurants?.find(r => r.id === stat.restaurantId);
                if (!restaurant) return null;

                return (
                  <div key={stat.restaurantId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{restaurant.name}</h4>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>被抽中: {stat.totalSpins} 次</span>
                        <span>優惠券發放: {stat.couponsIssued} 張</span>
                        <span>優惠券兌換: {stat.couponsRedeemed} 張</span>
                        <span>兌換率: {stat.redemptionRate}%</span>
                      </div>
                    </div>
                    <Link href={`/merchant/restaurants/${stat.restaurantId}`}>
                      <Button variant="ghost" size="sm">
                        查看詳情
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
