import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Send, Sparkles, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export default function NotificationManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCouponId, setSelectedCouponId] = useState<string>("none");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const utils = trpc.useUtils();

  // 查詢推播列表
  const { data: notifications, isLoading } = trpc.notification.list.useQuery();

  // 查詢所有優惠券（使用 listActive + 手動查詢）
  const { data: allRestaurants } = trpc.restaurants.listActive.useQuery();

  // 建立推播
  const createMutation = trpc.notification.create.useMutation({
    onSuccess: () => {
      toast.success("推播訊息建立成功");
      utils.notification.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`建立失敗：${error.message}`);
    },
  });

  // 發送推播
  const sendMutation = trpc.notification.send.useMutation({
    onSuccess: () => {
      toast.success("推播訊息已發送");
      utils.notification.list.invalidate();
    },
    onError: (error) => {
      toast.error(`發送失敗：${error.message}`);
    },
  });

  // 刪除推播
  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: () => {
      toast.success("推播訊息已刪除");
      utils.notification.list.invalidate();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // AI 文案生成
  const generateCopyMutation = trpc.notification.generateCopy.useMutation({
    onSuccess: (data) => {
      setTitle(data.title);
      setContent(data.content);
      setIsGenerating(false);
      toast.success("AI 文案生成成功");
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(`生成失敗：${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedCouponId("none");
    setScheduledAt("");
  };

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("請填寫標題和內容");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      couponId: selectedCouponId !== "none" ? Number(selectedCouponId) : undefined,
      scheduledAt: scheduledAt || undefined,
    });
  };

  const handleGenerateCopy = () => {
    if (!selectedCouponId || selectedCouponId === "none") {
      toast.error("請先選擇優惠券");
      return;
    }

    setIsGenerating(true);
    generateCopyMutation.mutate({ couponId: Number(selectedCouponId) });
  };

  const handleSend = (notificationId: number) => {
    // 使用 window.confirm 確保對話框顯示
    const confirmed = window.confirm("確定要發送此推播訊息嗎？發送後將無法撤回。");
    if (confirmed) {
      sendMutation.mutate({ notificationId });
    }
  };

  const handleDelete = (notificationId: number) => {
    if (confirm("確定要刪除此推播訊息嗎？")) {
      deleteMutation.mutate({ notificationId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">草稿</Badge>;
      case "scheduled":
        return <Badge variant="default">已排程</Badge>;
      case "sent":
        return <Badge variant="outline">已發送</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 查詢所有優惠券
  const couponQueries = trpc.useQueries((t) =>
    (allRestaurants || []).map((restaurant) =>
      t.coupons.listActiveByRestaurant({ restaurantId: restaurant.id })
    )
  );

  // 扁平化優惠券列表
  const allCoupons = allRestaurants?.flatMap((restaurant, index) => {
    const coupons = couponQueries[index]?.data || [];
    return coupons.map((coupon) => ({
      ...coupon,
      restaurantName: restaurant.name,
    }));
  }) || [];

  return (
    <div className="container py-8 space-y-6">
      {/* 推播管理標題區 - 白色背景 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              推播管理
            </h1>
            <p className="text-muted-foreground mt-2">
              建立推播訊息並發送給所有使用者
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                建立推播
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>建立推播訊息</DialogTitle>
              <DialogDescription>
                撰寫推播內容並選擇優惠券，或使用 AI 自動生成文案
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 優惠券選擇 */}
              <div className="space-y-2">
                <Label htmlFor="coupon">優惠券（選填）</Label>
                <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
                  <SelectTrigger id="coupon">
                    <SelectValue placeholder="選擇優惠券" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不選擇優惠券</SelectItem>
                    {allCoupons.map((coupon) => (
                      <SelectItem key={coupon.id} value={String(coupon.id)}>
                        {coupon.restaurantName} - {coupon.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI 文案生成按鈕 */}
              {selectedCouponId && selectedCouponId !== "none" && (
                <Button
                  variant="outline"
                  onClick={handleGenerateCopy}
                  disabled={isGenerating}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGenerating ? "生成中..." : "AI 自動生成文案"}
                </Button>
              )}

              {/* 標題 */}
              <div className="space-y-2">
                <Label htmlFor="title">標題 *</Label>
                <Input
                  id="title"
                  placeholder="例如：🎉 限時優惠！劉大爺豆花買一送一"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                />
                <p className="text-sm text-muted-foreground">
                  {title.length}/255 字
                </p>
              </div>

              {/* 內容 */}
              <div className="space-y-2">
                <Label htmlFor="content">內容 *</Label>
                <Textarea
                  id="content"
                  placeholder="例如：今天來劉大爺，享受超值優惠！新鮮手作豆花，Q彈芋圓，現在買一送一，錯過可惜！快來轉轉盤抽優惠券吧～"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                />
                <p className="text-sm text-muted-foreground">
                  {content.length} 字
                </p>
              </div>

              {/* 排程時間 */}
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">排程時間（選填）</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  留空則儲存為草稿，可稍後手動發送
                </p>
              </div>

              {/* 按鈕 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? "建立中..." : "建立推播"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* 推播列表 */}
      <Card>
        <CardHeader>
          <CardTitle>推播歷史記錄</CardTitle>
          <CardDescription>查看所有推播訊息的發送狀態</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">載入中...</p>
          ) : !notifications || notifications.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              尚無推播訊息，點擊右上角「建立推播」開始
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>標題</TableHead>
                  <TableHead>內容</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>建立時間</TableHead>
                  <TableHead>發送時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {notification.title}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {notification.content}
                    </TableCell>
                    <TableCell>{getStatusBadge(notification.status)}</TableCell>
                    <TableCell>
                      {format(new Date(notification.createdAt), "yyyy/MM/dd HH:mm", {
                        locale: zhTW,
                      })}
                    </TableCell>
                    <TableCell>
                      {notification.sentAt
                        ? format(new Date(notification.sentAt), "yyyy/MM/dd HH:mm", {
                            locale: zhTW,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {notification.status !== "sent" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSend(notification.id)}
                          disabled={sendMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          發送
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
