import { useAuth } from "@/_core/hooks/useAuth";
import CheckInDialog from "@/components/CheckInDialog";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { getCurrentMealPeriods, getPrimaryMealPeriod, filterRestaurantsByPeriod, filterOpenRestaurants } from "@/lib/timeUtils";
import { MapPin, Phone, Ticket, Navigation, Calendar, Settings, Info, Bell, Menu, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import SpinWheel from "@/components/SpinWheel";
import { toast } from "sonner";
import DigitalClock from "@/components/DigitalClock";
import SpinRulesDialog from "@/components/SpinRulesDialog";
import SimpleLoginDialog from "@/components/SimpleLoginDialog";

interface Coupon {
  id: number;
  title: string;
  description?: string | null;
  discountType?: string | null;
  discountValue?: string | null;
  imageUrl?: string | null;
}

interface SelectedRestaurant {
  id: number;
  name: string;
  address: string;
  phone?: string | null;
  description?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  coupon?: Coupon | null;
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [lineAuthUrl, setLineAuthUrl] = useState<string>("");
  
  // 查詢背景圖片
  const { data: bgImageData } = trpc.background.get.useQuery();
  
  const { data: lineAuthData } = trpc.lineAuth.getAuthUrl.useQuery(
    { redirectUri: `${window.location.origin}/line/callback` },
    { enabled: !isAuthenticated }
  );
  
  useEffect(() => {
    if (lineAuthData?.authUrl) {
      setLineAuthUrl(lineAuthData.authUrl);
    }
  }, [lineAuthData]);
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRestaurant, setSelectedRestaurant] = useState<SelectedRestaurant | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [spinHistoryId, setSpinHistoryId] = useState<number | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "distance">("default");
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: allRestaurants, isLoading: restaurantsLoading } = trpc.restaurants.listActiveWithCoupons.useQuery();
  
  // 取得轉盤資料（預先分配優惠券）
  const [wheelData, setWheelData] = useState<any[]>([]);
  
  // 取得轉盤版本
  const { data: wheelVersionData } = trpc.wheel.getVersion.useQuery();
  
  // 不再需要單獨查詢優惠券，因為已經包含在 restaurant 中
  // const { data: coupons } = trpc.coupons.listActiveByRestaurant.useQuery(
  //   { restaurantId: selectedRestaurant?.id || 0 },
  //   { enabled: !!selectedRestaurant }
  // );

  const { data: isRedeemed, refetch: refetchRedeemed } = trpc.redemptions.checkRedeemed.useQuery(
    { spinHistoryId: spinHistoryId || 0 },
    { enabled: !!spinHistoryId && isAuthenticated }
  );

  // 查詢未讀通知數量
  const { data: unreadData } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const recordSpinMutation = trpc.spin.recordSpin.useMutation();
  const redeemCouponMutation = trpc.redemptions.redeem.useMutation({
    onSuccess: () => {
      toast.success("優惠券兌換成功！");
      refetchRedeemed();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 每秒更新一次時間，確保與後端時間同步
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 請求使用者定位
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationPermissionDenied(false);
        },
        (error) => {
          console.log("無法取得定位:", error);
          // 如果是權限被拒絕，顯示提示訊息
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermissionDenied(true);
          }
        }
      );
    }
  }, []);

  // 計算距離（使用 Haversine 公式）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // 地球半徑（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const currentPeriod = getPrimaryMealPeriod(currentTime);
  // 直接根據店家營業時間篩選，不受用餐時段限制
  const availableRestaurants = allRestaurants
    ? filterOpenRestaurants(allRestaurants, currentTime)
    : [];
  
  // 查詢剩餘抽獎次數
  const { data: remainingSpins, refetch: refetchRemaining } = trpc.spin.getRemainingSpins.useQuery(
    { mealPeriod: (currentPeriod?.id || 'lunch') as 'breakfast' | 'lunch' | 'afternoon_tea' | 'dinner' | 'late_night' },
    { enabled: isAuthenticated && !!currentPeriod }
  );

  // 排序店家
  const sortRestaurants = (restaurantList: typeof availableRestaurants) => {
    if (!restaurantList) return [];
    
    if (sortBy === "distance" && userLocation) {
      return [...restaurantList].sort((a, b) => {
        const distA = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          parseFloat(a.latitude || "0"),
          parseFloat(a.longitude || "0")
        );
        const distB = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          parseFloat(b.latitude || "0"),
          parseFloat(b.longitude || "0")
        );
        return distA - distB;
      });
    }
    
    return restaurantList;
  };

  const sortedRestaurants = sortRestaurants(availableRestaurants);

  // 使用 useMemo 穩定 restaurantIds,避免無限循環
  const restaurantIds = useMemo(() => sortedRestaurants.map(r => r.id), [sortedRestaurants.map(r => r.id).join(',')]);

  // 使用 useQuery 取得轉盤資料
  const { data: wheelDataFromQuery } = trpc.spin.getWheelData.useQuery(
    { restaurantIds },
    { enabled: restaurantIds.length > 0 }
  );

  // 當轉盤資料改變時更新 state（只有在不旋轉時才更新，避免競態條件）
  useEffect(() => {
    if (isSpinning) {
      console.log('[Home] ⚠️ 轉盤旋轉中，跳過 wheelData 更新');
      return;
    }
    
    if (wheelDataFromQuery) {
      console.log('[Home] 取得轉盤資料:', wheelDataFromQuery);
      setWheelData(wheelDataFromQuery);
    } else {
      setWheelData([]);
    }
  }, [wheelDataFromQuery, isSpinning]);

  const drawMutation = trpc.spin.draw.useMutation();
  
  // 抽獎回調：前端傳入指針位置，後端記錄結果
  const handleSpin = async (selectedIndex: number, restaurantId: number, couponId: number | null) => {
    setIsSpinning(true);
    if (!currentPeriod) {
      throw new Error('無法取得當前時段');
    }
    
    // 確保 wheelData 已經載入
    if (wheelData.length === 0) {
      throw new Error('轉盤資料尚未載入');
    }
    
    console.log('[Home] 前端傳入結果:', {
      selectedIndex,
      restaurantId,
      couponId,
    });
    
    // ✨ 前端決定位置，後端記錄結果
    const result = await drawMutation.mutateAsync({
      mealPeriod: currentPeriod.id as 'breakfast' | 'lunch' | 'afternoon_tea' | 'dinner' | 'late_night',
      selectedIndex,
      restaurantId,
      couponId,
    });
    
    console.log('[Home] ✅ 後端返回結果:', {
      restaurant: result.restaurant.name,
      coupon: result.coupon?.title || '無優惠券',
      spinHistoryId: result.spinHistoryId,
    });
    
    // 重新查詢剩餘次數
    await refetchRemaining();
    
    setIsSpinning(false);
    
    return result;
  };
  
  const handleSpinResult = async (restaurant: SelectedRestaurant, selectedCoupon?: any, spinHistoryId?: number) => {
    // ✨ 直接使用後端返回的結果，不需要任何角度驗證
    console.log('[Home] 🎉 顯示中獎結果:', {
      restaurant: restaurant.name,
      coupon: selectedCoupon?.title || '無優惠券',
      spinHistoryId,
    });
    
    setSelectedRestaurant(restaurant);
    setSelectedCoupon(selectedCoupon || null);
    setIsResultDialogOpen(true);

    // 設定 spinHistoryId（後端已經記錄）
    if (spinHistoryId) {
      setSpinHistoryId(spinHistoryId);
    }
  };

  const handleRedeem = async () => {
    if (!isAuthenticated) {
      toast.error("請先登入才能兌換優惠券");
      return;
    }

    if (!selectedRestaurant || !selectedCoupon) {
      toast.error("無法兌換優惠券");
      return;
    }

    await redeemCouponMutation.mutateAsync({
      restaurantId: selectedRestaurant.id,
      couponId: selectedCoupon.id,
      spinHistoryId: spinHistoryId || undefined,
    });
  };

  const handleNavigate = () => {
    if (!selectedRestaurant) return;

    const address = selectedRestaurant.address;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(mapsUrl, "_blank");
  };

  // 當選中店家時，自動選擇其優惠券
  // 注意：這裡不再需要自動設定，因為轉盤結果後已經設定了
  // useEffect(() => {
  //   if (selectedRestaurant?.coupon) {
  //     setSelectedCoupon(selectedRestaurant.coupon);
  //   } else {
  //     setSelectedCoupon(null);
  //   }
  // }, [selectedRestaurant]);

  if (loading || restaurantsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <>
      <PWAInstallPrompt />
      <div 
        className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 relative"
      style={bgImageData?.url ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${bgImageData.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      } : undefined}
    >
      {/* 頂部導航 - 放大版 */}
      <header className="bg-white dark:bg-gray-900 border-b-2 sticky top-0 z-50">
        <div className="container py-3 sm:py-4 px-3 sm:px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-black text-primary">{APP_TITLE}</h1>
            </div>
            
            {/* 導航按鈕 */}
            <div className="flex items-center gap-2 sm:gap-3">
              {isAuthenticated ? (
                <>
                  {/* 通知 */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLocation("/notifications")}
                    className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2"
                  >
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                    {unreadData && unreadData.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadData.unreadCount > 9 ? '9+' : unreadData.unreadCount}
                      </span>
                    )}
                  </Button>
                  
                  {/* 我的優惠券 */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLocation("/my-coupons")}
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2"
                  >
                    <Ticket className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                  
                  {/* 管理後台 */}
                  {user?.role === 'admin' && (
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation("/admin")}
                      className="h-12 sm:h-14 rounded-xl border-2 px-3 sm:px-4 flex items-center gap-1.5"
                    >
                      <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span className="text-base sm:text-lg font-bold">管理後台</span>
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  variant="default" 
                  onClick={() => setIsLoginDialogOpen(true)}
                  className="h-12 sm:h-14 rounded-xl px-6 sm:px-8 text-base sm:text-lg font-bold"
                >
                  登入
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="container px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
          {/* 定位授權提示 */}
          {locationPermissionDenied && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    啟用定位功能，獲得更好體驗
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    授權定位後，您可以：
                  </p>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 mb-3">
                    <li>• 查看每個店家距離您的距離</li>
                    <li>• 使用「距離排序」功能，快速找到附近店家</li>
                  </ul>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-amber-700 dark:text-amber-300 font-medium hover:underline">
                      如何啟用定位？
                    </summary>
                    <div className="mt-2 space-y-2 text-amber-800 dark:text-amber-200 pl-4">
                      <p className="font-medium">方法1：透過網址列設定</p>
                      <ol className="list-decimal list-inside space-y-1 pl-2">
                        <li>點擊瀏覽器網址列左側的鎖頭圖示</li>
                        <li>找到「位置」或「Location」權限</li>
                        <li>選擇「允許」</li>
                        <li>重新整理頁面</li>
                      </ol>
                      <p className="font-medium mt-3">方法2：透過瀏覽器設定</p>
                      <p className="pl-2">
                        Chrome：設定 → 隱私權和安全性 → 網站設定 → 位置
                      </p>
                    </div>
                  </details>
                </div>
                <button
                  onClick={() => setLocationPermissionDenied(false)}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0"
                  aria-label="關閉提示"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {/* 標題區 - 簡化版：縮小橘色區域，移除 LOGO */}
          <div className="bg-gradient-to-b from-orange-500 to-orange-400 rounded-2xl mx-2 sm:mx-4 p-4 sm:p-5 text-center space-y-2 sm:space-y-3 animate-slide-in-bottom">
            {/* 主標題 - 縮小 */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight" style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.2)' }}>
              今天吃什麼？
            </h1>
            
            {/* 副標題 - 縮小 */}
            <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl mx-auto font-medium">
              草屯在地美食,抽出驚喜優惠！
            </p>
            
            {/* 時鐘區域 - 縮小 */}
            <div className="flex justify-center">
              <DigitalClock />
            </div>
            
            {/* 查看抽獎規則按鈕 - 縮小 */}
            <Button
              variant="outline"
              onClick={() => setIsRulesDialogOpen(true)}
              className="mx-auto bg-white hover:bg-gray-50 text-gray-700 rounded-full border-0 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold shadow-md"
            >
              <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5" />
              查看抽獎規則
            </Button>
          </div>

          {/* 轉盤區 */}
          <Card className="glass-card border-2 shadow-xl animate-slide-in-bottom delay-100">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {availableRestaurants.length > 0 ? (
                <div className="space-y-4">
                  {/* 剩餘次數顯示 */}
                  {isAuthenticated && remainingSpins && (
                    <div className="text-center">
                      {remainingSpins.isAdmin ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full">
                          <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                            👑 管理員模式：<span className="text-xl font-bold">無限次數</span>
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full">
                            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                              本時段剩餘 <span className="text-xl font-bold">{remainingSpins.remainingInPeriod}</span> 次抽獎機會
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            今日剩餘 {remainingSpins.remainingInDay} / 10 次
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* 轉盤 */}
                  {(!isAuthenticated || (remainingSpins && (remainingSpins.isAdmin || remainingSpins.canSpin))) ? (
                    <SpinWheel
                      restaurants={sortedRestaurants}
                      wheelData={wheelData}
                      onResult={handleSpinResult}
                      onSpin={handleSpin}
                      wheelVersion={(wheelVersionData?.version as 'v1' | 'v2' | 'v3' | 'canvas') || 'canvas'}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-lg font-medium text-muted-foreground">
                        {remainingSpins?.remainingInPeriod === 0 && remainingSpins?.remainingInDay > 0
                          ? '本時段抽獎次數已用完，請於下個時段再來！'
                          : '今日抽獎次數已達上限，明天再來吧！'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        每個時段可抽 2 次，每天最多 10 次
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">目前沒有營業的店家</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    請稍候，店家即將營業
                  </p>
                </div>              )}
            </CardContent>
          </Card>

          {/* 簽到卡片 - Manus 樣式 */}
          {isAuthenticated && (
            <Card className="glass-card border-2 shadow-xl animate-slide-in-bottom delay-150 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300" onClick={() => setIsCheckInDialogOpen(true)}>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-4 shadow-lg">
                      <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">每日簽到</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">連續簽到 7 天可獲得專屬優惠券</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Button size="lg" className="rounded-full px-6 sm:px-8 text-base sm:text-lg font-bold">
                      立即簽到
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 店家列表區 */}
          {availableRestaurants.length > 0 && (
            <div className="space-y-4 animate-slide-in-bottom delay-200 px-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  營業中的店家 ({availableRestaurants.length})
                </h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "default" | "distance")}
                  className="w-full sm:w-auto px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800"
                  disabled={sortBy === "distance" && !userLocation}
                >
                  <option value="default">預設排序</option>
                  <option value="distance" disabled={!userLocation}>
                    {userLocation ? "距離排序" : "距離排序（需授權定位）"}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {sortedRestaurants.map((restaurant, index) => {
                  const distance = userLocation
                    ? calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        parseFloat(restaurant.latitude || "0"),
                        parseFloat(restaurant.longitude || "0")
                      )
                    : null;

                  return (
                    <Card
                      key={restaurant.id}
                      className="overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group animate-slide-in-left"
                      style={{ animationDelay: `${(index % 3) * 100 + 300}ms` }}
                      onClick={() => {
                        const address = restaurant.address;
                        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
                        window.open(mapsUrl, "_blank");
                      }}
                    >
                      {restaurant.photoUrl ? (
                        <div className="aspect-video w-full overflow-hidden">
                          <img
                            src={restaurant.photoUrl}
                            alt={restaurant.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video w-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                          <span className="text-4xl">🍴</span>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                          {distance !== null && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {distance.toFixed(1)} km
                            </span>
                          )}
                        </div>
                        <CardDescription className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{restaurant.address}</span>
                        </CardDescription>
                      </CardHeader>
                      {restaurant.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {restaurant.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 結果對話框 - 同比例放大，不留空白 */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="w-[92vw] max-w-[500px] max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl sm:text-3xl text-center font-black">🎉 恭喜獲得優惠券！</DialogTitle>
            <DialogDescription className="text-base sm:text-lg text-center">快來看看你抽到什麼好康</DialogDescription>
          </DialogHeader>
          
          {selectedRestaurant && (
            <div className="space-y-4 mt-3">
              {/* 優惠券資訊（優先顯示） */}
              {selectedCoupon && (
                <Card className="coupon-card text-white overflow-hidden">
                  {/* 優惠券圖片 */}
                  {selectedCoupon.imageUrl && (
                    <div className="w-full h-36 sm:h-44 relative">
                      <img
                        src={selectedCoupon.imageUrl}
                        alt={selectedCoupon.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-3">
                      <Ticket className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0" />
                      <CardTitle className="text-white text-lg sm:text-xl font-bold">{selectedCoupon.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-white/90 text-sm sm:text-base leading-relaxed">{selectedCoupon.description}</p>
                    {selectedCoupon.expiresAt && (
                      <p className="text-xs sm:text-sm text-white/70 mt-2">
                        有效期限：{new Date(selectedCoupon.expiresAt).toLocaleDateString('zh-TW')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 店家資訊 */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base sm:text-lg font-bold">{selectedRestaurant.name}</CardTitle>
                  {selectedRestaurant.description && (
                    <CardDescription className="text-sm sm:text-base mt-1.5 leading-relaxed">{selectedRestaurant.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  <div className="flex items-start gap-2 text-sm sm:text-base">
                    <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>{selectedRestaurant.address}</span>
                  </div>
                  {selectedRestaurant.phone && (
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{selectedRestaurant.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 操作按鈕 - 放大白色文字 */}
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={handleNavigate}
                  className="w-full h-14 sm:h-16 text-xl sm:text-2xl font-black text-white rounded-xl shadow-lg"
                >
                  <Navigation className="h-6 w-6 sm:h-7 sm:w-7 mr-3" />
                  立即導航
                </Button>
                
                {isAuthenticated && selectedCoupon && (
                  <Button
                    size="lg"
                    variant={isRedeemed ? "secondary" : "default"}
                    onClick={handleRedeem}
                    disabled={isRedeemed || redeemCouponMutation.isPending}
                    className="w-full h-14 sm:h-16 text-xl sm:text-2xl font-black text-white rounded-xl shadow-lg"
                  >
                    <Ticket className="h-6 w-6 sm:h-7 sm:w-7 mr-3" />
                    {isRedeemed ? "已兑換" : "確認兑換"}
                  </Button>
                )}

                {!isAuthenticated && (
                  <p className="text-sm sm:text-base text-center text-muted-foreground mt-1">
                    登入後即可兑換優惠券
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 簽到對話框 */}
      <CheckInDialog
        open={isCheckInDialogOpen}
        onOpenChange={setIsCheckInDialogOpen}
      />
      
      {/* 抽獎規則說明對話框 */}
      <SpinRulesDialog
        open={isRulesDialogOpen}
        onOpenChange={setIsRulesDialogOpen}
      />
      
      {/* 簡易登入對話框 */}
      <SimpleLoginDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
      />
      </div>
    </>
  );
}