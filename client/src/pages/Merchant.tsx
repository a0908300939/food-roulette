import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, BarChart3, Home } from "lucide-react";
import { useLocation, Route, Switch } from "wouter";
import MerchantDashboard from "./merchant/Dashboard";
import MerchantRestaurantList from "./merchant/RestaurantList";
import MerchantRestaurantEdit from "./merchant/RestaurantEdit";
import MerchantStatistics from "./merchant/Statistics";

export default function Merchant() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">載入中...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'merchant') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-2xl font-bold">權限不足</h1>
          <p className="text-muted-foreground">您需要商家權限才能訪問此頁面</p>
          <Button onClick={() => setLocation("/")}>返回首頁</Button>
        </div>
      </DashboardLayout>
    );
  }

  // 如果是子路由（編輯頁面），直接渲染對應頁面
  if (location.startsWith('/merchant/restaurants/') && location !== '/merchant/restaurants') {
    return (
      <DashboardLayout>
        <MerchantRestaurantEdit />
      </DashboardLayout>
    );
  }

  // 主頁面使用 Tabs
  const currentTab = location === '/merchant' ? 'dashboard' 
    : location === '/merchant/restaurants' ? 'restaurants'
    : location === '/merchant/statistics' ? 'statistics'
    : 'dashboard';

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'dashboard':
        setLocation('/merchant');
        break;
      case 'restaurants':
        setLocation('/merchant/restaurants');
        break;
      case 'statistics':
        setLocation('/merchant/statistics');
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">商家後台</h1>
          <p className="text-muted-foreground">管理您的店鋪資訊和查看數據統計</p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>首頁</span>
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span>我的店鋪</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>數據統計</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <MerchantDashboard />
          </TabsContent>

          <TabsContent value="restaurants">
            <MerchantRestaurantList />
          </TabsContent>

          <TabsContent value="statistics">
            <MerchantStatistics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
