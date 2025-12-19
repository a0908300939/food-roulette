import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, BarChart3, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import MerchantDashboard from "./merchant/Dashboard";
import MerchantRestaurantList from "./merchant/RestaurantList";
import MerchantStatistics from "./merchant/Statistics";

export default function Merchant() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

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

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">商家後台</h1>
          <p className="text-muted-foreground">管理您的店鋪與查看數據分析</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 gap-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">首頁</span>
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">我的店鋪</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">數據統計</span>
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
