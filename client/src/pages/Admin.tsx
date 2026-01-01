import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Store, Ticket, Users, BarChart3, Settings, Bell, Briefcase } from "lucide-react";
import { useLocation } from "wouter";
import RestaurantManagement from "./admin/RestaurantManagement";
import CouponManagement from "./admin/CouponManagement";
import UserManagement from "./admin/UserManagement";
import AnalyticsDashboard from "./admin/AnalyticsDashboard";
import WheelImageSettings from "./admin/WheelImageSettings";
import NotificationManagement from "./NotificationManagement";


export default function Admin() {
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

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-2xl font-bold">權限不足</h1>
          <p className="text-muted-foreground">您需要管理員權限才能訪問此頁面</p>
          <Button onClick={() => setLocation("/")}>返回首頁</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">管理後台</h1>
          <p className="text-lg sm:text-xl text-muted-foreground">管理店家、優惠券與查看數據分析</p>
        </div>

        <Tabs defaultValue="restaurants" className="space-y-6">
          <TabsList className="w-full overflow-x-auto" style={{display: 'flex', gap: '0.5rem', borderRadius: '15px', marginTop: '-2px', marginBottom: '25px', marginLeft: '-4px', width: '100%', minHeight: '64px', borderStyle: 'outset', flexWrap: 'wrap'}}>
            <TabsTrigger value="restaurants" className="flex items-center gap-2 px-4 py-3 text-base font-semibold whitespace-nowrap">
              <Store className="h-5 w-5" />
              <span className="hidden sm:inline">店家管理</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex items-center gap-2 px-4 py-3 text-base font-semibold whitespace-nowrap">
              <Ticket className="h-5 w-5" />
              <span className="hidden sm:inline">優惠券</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-3 text-base font-semibold whitespace-nowrap">
              <Users className="h-5 w-5" />
              <span className="hidden sm:inline">使用者 消費者</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 px-4 py-3 text-base font-semibold whitespace-nowrap">
              <BarChart3 className="h-5 w-5" />
              <span className="hidden sm:inline">數據分析</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 px-4 py-3 text-base font-semibold whitespace-nowrap">
              <Settings className="h-5 w-5" />
              <span className="hidden sm:inline">轉盤設定</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 px-4 py-3 text-base font-semibold whitespace-nowrap">
              <Bell className="h-5 w-5" />
              <span className="hidden sm:inline">推播管理</span>
            </TabsTrigger>

          </TabsList>

          <TabsContent value="restaurants">
            <RestaurantManagement />
          </TabsContent>

          <TabsContent value="coupons">
            <CouponManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings">
            <WheelImageSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationManagement />
          </TabsContent>


        </Tabs>
      </div>
    </DashboardLayout>
  );
}
