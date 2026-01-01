import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { MapPin, Phone, Navigation, Ticket, Calendar, CheckCircle2, XCircle, Clock, Share2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { isCouponExpired, getDaysExpired } from "@/lib/couponUtils";
import { shareWithWebShareAPI, copyShareLink, shareToLine, shareToFacebook } from "@/lib/shareUtils";

export default function MyCoupons() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "unused" | "used" | "expired">("all");

  // 查詢使用者的所有優惠券
  const { data: coupons, isLoading: couponsLoading, refetch } = trpc.userCoupons.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // 兌換優惠券 mutation
  const redeemMutation = trpc.redemptions.redeem.useMutation({
    onSuccess: () => {
      toast.success("優惠券兌換成功！");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "兌換失敗");
    },
  });

  // 分享獎勵 mutation（必須在所有條件判斷之前呼叫）
  // @ts-ignore - tRPC 類型尚未更新
  const recordShareMutation = trpc.spin.recordShare.useMutation({
    onSuccess: (data: { success: boolean; message: string }) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error: any) => {
      // 如果是已經分享過，不顯示錯誤，只是提示
      if (error.message && error.message.includes('已經分享過')) {
        toast.info(error.message);
      } else {
        toast.error(error.message || '獎勵領取失敗');
      }
    },
  });

  if (loading || couponsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">請先登入</h1>
        <p className="text-muted-foreground">登入後即可查看您的優惠券</p>
        <Button onClick={() => window.location.href = getLoginUrl()}>
          立即登入
        </Button>
      </div>
    );
  }

  // 篩選優惠券
  const filteredCoupons = coupons?.filter((coupon) => {
    // 計算過期狀態，考慮簽到獎勵的 7 天延長期限
    const expired = isCouponExpired(new Date(coupon.createdAt), coupon.isCheckInReward);
    
    
    if (filter === "unused") return !coupon.isRedeemed && !expired;
    if (filter === "used") return coupon.isRedeemed;
    if (filter === "expired") return expired && !coupon.isRedeemed;
    return true; // all
  }) || [];

  const handleRedeem = (couponId: number, restaurantId: number, spinHistoryId: number) => {
    redeemMutation.mutate({
      couponId,
      restaurantId,
      spinHistoryId,
    });
  };

  const handleNavigate = (latitude: string, longitude: string, name: string) => {
    if (!latitude || !longitude) {
      toast.error("店家位置資訊不完整");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, "_blank");
  };

  const handleShare = async (coupon: typeof filteredCoupons[0]) => {
    const shareData = {
      couponTitle: coupon.couponTitle,
      restaurantName: coupon.restaurantName,
      restaurantAddress: coupon.restaurantAddress,
      expiryDate: new Date(coupon.createdAt).toLocaleDateString(),
      description: coupon.couponDescription,
    };

    // 優先使用 Web Share API（行動裝置原生分享）
    const shareResult = await shareWithWebShareAPI(shareData);
    
    if (shareResult === 'success') {
      // 分享成功，記錄分享並獲得獎勵
      toast.success("分享成功！獲得 1 次轉盤機會");
      recordShareMutation.mutate({ spinHistoryId: coupon.id });
      return;
    }
    
    if (shareResult === 'cancelled') {
      // 使用者取消分享，不顯示任何提示
      console.log('User cancelled share');
      return;
    }

    // 如果不支援 Web Share API，顯示平台選項
    if (shareResult === 'unsupported') {
      // 建立平台選項對話框
      const platform = prompt(
        '請選擇分享平台：\n1. LINE\n2. Facebook\n3. 複製連結',
        '1'
      );

      if (!platform) return; // 使用者取消

      if (platform === '1') {
        shareToLine(shareData);
        toast.success("已開啟 LINE 分享");
        recordShareMutation.mutate({ spinHistoryId: coupon.id });
      } else if (platform === '2') {
        shareToFacebook(shareData);
        toast.success("已開啟 Facebook 分享");
        recordShareMutation.mutate({ spinHistoryId: coupon.id });
      } else if (platform === '3') {
        const copied = await copyShareLink(shareData);
        if (copied) {
          toast.success("已複製分享連結！可以貼上到任何平台分享");
          recordShareMutation.mutate({ spinHistoryId: coupon.id });
        } else {
          toast.error("複製失敗，請再試一次");
        }
      }
      return;
    }

    // 發生錯誤時的降級方案
    const copied = await copyShareLink(shareData);
    if (copied) {
      toast.success("已複製分享連結！可以貼上到任何平台分享");
      recordShareMutation.mutate({ spinHistoryId: coupon.id });
    } else {
      toast.error("分享失敗，請再試一次");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-400">
      {/* Header - Manus 樣式 */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container py-4 px-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => setLocation("/")}
              className="h-12 sm:h-14 rounded-xl border-2 px-4 sm:px-6 flex items-center gap-2"
            >
              ← 返回首頁
            </Button>
            <div className="text-sm sm:text-base text-muted-foreground font-medium">
              {APP_TITLE}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* 標題區 - Manus 樣式：大白色標題 */}
        <div className="text-center py-8 mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight" style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.2)' }}>
            我的優惠券
          </h1>
          <p className="text-lg sm:text-xl text-white/90 mt-4">
            查看您的所有優惠券
          </p>
        </div>

        {/* Filter - 白色卡片 */}
        <Card className="mb-6 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
          <label className="text-sm font-medium">篩選：</label>
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="unused">未使用</SelectItem>
              <SelectItem value="used">已使用</SelectItem>
              <SelectItem value="expired">已過期</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            共 {filteredCoupons.length} 張優惠券
          </span>
            </div>
          </CardContent>
        </Card>

        {/* Coupons List */}
        {filteredCoupons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                {filter === "all" ? "您還沒有任何優惠券" : "沒有符合條件的優惠券"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                快去轉轉盤抽取優惠券吧！
              </p>
              <Button className="mt-4" onClick={() => setLocation("/")}>
                前往首頁
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCoupons.map((coupon) => {
              const isCheckInReward = coupon.isCheckInReward;
              
              // 計算過期狀態，考慮簽到獎勵的 7 天延長期限
              const expired = isCouponExpired(new Date(coupon.createdAt), isCheckInReward);
              const daysExpired = getDaysExpired(new Date(coupon.createdAt), isCheckInReward);
              const canRedeem = !expired && !coupon.isRedeemed && coupon.couponId !== null;
              
              // 計算簽到獎勵的過期日期
              const checkInRewardExpiry = isCheckInReward ? new Date(new Date(coupon.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000) : null;

              return (
                <Card 
                  key={coupon.id} 
                  className={`${
                    isCheckInReward 
                      ? 'bg-[#f4c430] border border-amber-500 shadow-lg'
                      : ''
                  } ${expired ? "opacity-60" : ""}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{coupon.couponTitle}</CardTitle>
                          {isCheckInReward && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-100 rounded-full text-xs font-medium">
                              簽到獎勵
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {coupon.isRedeemed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            已使用
                          </span>
                        ) : expired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs">
                            <XCircle className="w-3 h-3" />
                            已過期
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs">
                            <Clock className="w-3 h-3" />
                            未使用
                          </span>
                        )}
                      </div>
                    </div>
                    <CardDescription className="mt-2">
                      {coupon.restaurantName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 優惠券描述 */}
                    <div className="text-sm text-muted-foreground">
                      {coupon.couponDescription}
                    </div>

                    {/* 有效期限 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className={isCheckInReward ? "text-amber-700 dark:text-amber-300 font-medium" : "text-muted-foreground"}>
                        {isCheckInReward
                          ? `簽到獎勵有效期至 ${checkInRewardExpiry?.toLocaleDateString()} 23:59`
                          : expired
                          ? `已過期 ${daysExpired} 天`
                          : `有效期至 ${new Date(coupon.createdAt).toLocaleDateString()} 23:59`}
                      </span>
                    </div>

                    {/* 店家資訊 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">{coupon.restaurantAddress}</span>
                      </div>
                      {coupon.restaurantPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a
                            href={`tel:${coupon.restaurantPhone}`}
                            className="text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            {coupon.restaurantPhone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* 操作按鈕 */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            handleNavigate(
                              coupon.restaurantLatitude,
                              coupon.restaurantLongitude,
                              coupon.restaurantName
                            )
                          }
                          disabled={!coupon.restaurantLatitude || !coupon.restaurantLongitude}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          導航
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            if (coupon.couponId !== null) {
                              handleRedeem(coupon.couponId, coupon.restaurantId, coupon.id);
                            }
                          }}
                          disabled={!canRedeem || redeemMutation.isPending}
                        >
                          {coupon.isRedeemed ? "已兌換" : expired ? "已過期" : coupon.couponId === null ? "無法兌換" : "立即兌換"}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleShare(coupon)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        分享我的優惠券
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
