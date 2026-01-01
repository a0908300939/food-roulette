import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import SimpleLoginDialog from "@/components/SimpleLoginDialog";
import { useState } from "react";

export default function Notifications() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  // 查詢使用者的推播訊息
  const { data: notifications, isLoading } = trpc.notification.listForUser.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  // 標記為已讀
  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.listForUser.invalidate();
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container py-8">
          <p className="text-center text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-20 w-20 rounded-xl object-cover shadow"
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
              <p className="text-sm text-muted-foreground">
                請先登入以查看通知
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsLoginDialogOpen(true)}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            登入 / 註冊
          </Button>
          <SimpleLoginDialog 
            open={isLoginDialogOpen} 
            onOpenChange={setIsLoginDialogOpen}
          />
        </div>
      </div>
    );
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-400">
      {/* 頂部導航 - Manus 樣式 */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-10 w-10 sm:h-12 sm:w-12" />}
              <h1 className="text-xl sm:text-2xl font-bold text-primary">{APP_TITLE}</h1>
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
      </header>

      {/* 主要內容 */}
      <div className="container py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 標題區 - Manus 樣式：大白色標題 */}
          <div className="text-center py-8">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight flex items-center justify-center gap-4" style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.2)' }}>
              <Bell className="h-12 w-12 sm:h-16 sm:w-16" />
              通知中心
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mt-4">
              查看所有推播訊息與優惠通知
            </p>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-lg px-4 py-2 mt-4">
                {unreadCount} 則未讀
              </Badge>
            )}
          </div>

          {/* 通知列表 - 白色卡片 */}
          {isLoading ? (
            <Card className="shadow-xl">
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">載入中...</p>
              </CardContent>
            </Card>
          ) : !notifications || notifications.length === 0 ? (
            <Card className="shadow-xl">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <BellOff className="h-16 w-16 text-muted-foreground" />
                  <p className="text-center text-muted-foreground text-lg">
                    目前沒有通知訊息
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all shadow-xl hover:shadow-2xl hover:scale-105 ${
                    notification.isRead
                      ? "opacity-80"
                      : "border-primary border-2"
                  }`}
                >
                  <CardHeader className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                          {notification.title}
                          {!notification.isRead && (
                            <Badge variant="default" className="ml-2 text-sm">
                              新
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                          {notification.sentAt &&
                            format(
                              new Date(notification.sentAt),
                              "yyyy年MM月dd日 HH:mm",
                              { locale: zhTW }
                            )}
                        </CardDescription>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                          className="rounded-xl"
                        >
                          標記為已讀
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-foreground whitespace-pre-wrap text-base sm:text-lg">
                      {notification.content}
                    </p>
                    {notification.imageUrl && (
                      <div className="mt-4">
                        <img
                          src={notification.imageUrl}
                          alt={notification.title}
                          className="rounded-lg max-w-full h-auto shadow-lg"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
