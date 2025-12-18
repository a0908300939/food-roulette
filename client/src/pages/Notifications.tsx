import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";

export default function Notifications() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

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
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            登入
          </Button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      {/* 頂部導航 */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />}
              <h1 className="text-xl font-bold text-primary">{APP_TITLE}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              返回首頁
            </Button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 標題區 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <Bell className="h-8 w-8" />
                通知中心
              </h2>
              <p className="text-muted-foreground mt-2">
                查看所有推播訊息與優惠通知
              </p>
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {unreadCount} 則未讀
              </Badge>
            )}
          </div>

          {/* 通知列表 */}
          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">載入中...</p>
              </CardContent>
            </Card>
          ) : !notifications || notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <BellOff className="h-16 w-16 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
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
                  className={`transition-all ${
                    notification.isRead
                      ? "opacity-60"
                      : "border-primary shadow-md"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {notification.title}
                          {!notification.isRead && (
                            <Badge variant="default" className="ml-2">
                              新
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
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
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          標記為已讀
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">
                      {notification.content}
                    </p>
                    {notification.imageUrl && (
                      <div className="mt-4">
                        <img
                          src={notification.imageUrl}
                          alt={notification.title}
                          className="rounded-lg max-w-full h-auto"
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
