import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Store, Ticket, Users, BarChart3, Settings, Bell, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import RestaurantManagement from "./admin/RestaurantManagement";
import CouponManagement from "./admin/CouponManagement";
import UserManagement from "./admin/UserManagement";
import AnalyticsDashboard from "./admin/AnalyticsDashboard";
import WheelImageSettings from "./admin/WheelImageSettings";
import NotificationManagement from "./NotificationManagement";

type TabValue = "restaurants" | "coupons" | "users" | "analytics" | "settings" | "notifications";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabValue>("restaurants");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-700 to-amber-600 flex items-center justify-center">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-700 to-amber-600 flex flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-4xl font-bold text-white">權限不足</h1>
        <p className="text-xl text-white/90">您需要管理員權限才能訪問此頁面</p>
        <Button size="lg" onClick={() => setLocation("/")} className="rounded-xl">
          返回首頁
        </Button>
      </div>
    );
  }

  const tabs = [
    { value: "restaurants", icon: Store, label: "店家管理" },
    { value: "coupons", icon: Ticket, label: "優惠券" },
    { value: "users", icon: Users, label: "使用者管理" },
    { value: "analytics", icon: BarChart3, label: "數據分析" },
    { value: "settings", icon: Settings, label: "轉盤設定" },
    { value: "notifications", icon: Bell, label: "推播管理" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-700 to-amber-600">
      {/* 頂部導航 - Manus 樣式 */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-10 w-10 sm:h-12 sm:w-12" />}
              <h1 className="text-xl sm:text-2xl font-bold text-primary">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm sm:text-base text-muted-foreground font-medium hidden sm:block">
                {user?.email || user?.name}
              </div>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setLocation("/")}
                className="h-12 sm:h-14 rounded-xl border-2 px-4 sm:px-6 flex items-center gap-2"
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-base sm:text-lg font-semibold">返回首頁</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <div className="container py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 標題區 - Manus 樣式：大白色標題 */}
          <div className="text-center py-8">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight" style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.2)' }}>
              管理後台
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mt-4">
              管理店家、優惠券與查看數據分析
            </p>
          </div>

          {/* 功能按鈕區 - Manus 樣式：大圖示按鈕 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Card
                  key={tab.value}
                  className={`cursor-pointer transition-all hover:shadow-2xl hover:scale-105 ${
                    activeTab === tab.value ? "border-primary border-2 shadow-xl" : "shadow-lg"
                  }`}
                  onClick={() => setActiveTab(tab.value as TabValue)}
                >
                  <CardContent className="p-6 flex flex-col items-center gap-3">
                    <div className={`rounded-2xl p-4 ${
                      activeTab === tab.value 
                        ? "bg-gradient-to-br from-orange-400 to-orange-600" 
                        : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800"
                    }`}>
                      <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${
                        activeTab === tab.value ? "text-white" : "text-gray-600 dark:text-gray-300"
                      }`} />
                    </div>
                    <span className={`text-sm sm:text-base font-semibold text-center ${
                      activeTab === tab.value ? "text-primary" : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {tab.label}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 內容區 - 白色卡片 */}
          <Card className="shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              {activeTab === "restaurants" && <RestaurantManagement />}
              {activeTab === "coupons" && <CouponManagement />}
              {activeTab === "users" && <UserManagement />}
              {activeTab === "analytics" && <AnalyticsDashboard />}
              {activeTab === "settings" && <WheelImageSettings />}
              {activeTab === "notifications" && <NotificationManagement />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
