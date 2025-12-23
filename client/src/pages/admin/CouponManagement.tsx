import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface CouponFormData {
  restaurantId: number;
  title: string;
  description: string;
  imageUrl?: string;
  type: "discount" | "gift" | "cashback" | "check_in_reward";
  isCheckInReward: boolean;
  isActive: boolean;
}

export default function CouponManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [formData, setFormData] = useState<CouponFormData>({
    restaurantId: 0,
    title: "",
    description: "",
    imageUrl: "",
    type: "discount",
    isCheckInReward: false,
    isActive: true,
  });

  const utils = trpc.useUtils();
  const { data: restaurants } = trpc.restaurants.list.useQuery();
  
  // 根據選擇的店家載入優惠券
  const { data: coupons, isLoading } = trpc.coupons.listByRestaurant.useQuery(
    { restaurantId: selectedRestaurant || 0 },
    { enabled: !!selectedRestaurant }
  );

  const createMutation = trpc.coupons.create.useMutation({
    onSuccess: () => {
      utils.coupons.listByRestaurant.invalidate();
      toast.success("優惠券新增成功");
      resetForm();
    },
    onError: (error) => {
      toast.error(`新增失敗：${error.message}`);
    },
  });

  const updateMutation = trpc.coupons.update.useMutation({
    onSuccess: () => {
      utils.coupons.listByRestaurant.invalidate();
      toast.success("優惠券更新成功");
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteMutation = trpc.coupons.delete.useMutation({
    onSuccess: () => {
      utils.coupons.listByRestaurant.invalidate();
      toast.success("優惠券刪除成功");
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const uploadImageMutation = trpc.coupons.uploadImage.useMutation({
    onSuccess: () => {
      utils.coupons.listByRestaurant.invalidate();
    },
    onError: (error) => {
      toast.error(`圖片上傳失敗：${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      restaurantId: selectedRestaurant || 0,
      title: "",
      description: "",
      imageUrl: "",
      type: "discount",
      isCheckInReward: false,
      isActive: true,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      restaurantId: formData.restaurantId || selectedRestaurant,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (coupon: any) => {
    setEditingId(coupon.id);
    setFormData({
      restaurantId: coupon.restaurantId,
      title: coupon.title,
      description: coupon.description,
      imageUrl: coupon.imageUrl || "",
      type: coupon.type,
      isCheckInReward: coupon.isCheckInReward || false,
      isActive: coupon.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此優惠券嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  const getCouponTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      discount: "折扣",
      gift: "贈品",
      cashback: "現金回饋",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>選擇店家</CardTitle>
          <CardDescription>請先選擇一家店家以管理其優惠券</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedRestaurant?.toString() || ""}
            onValueChange={(value) => setSelectedRestaurant(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇店家" />
            </SelectTrigger>
            <SelectContent>
              {restaurants?.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedRestaurant && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>優惠券管理</CardTitle>
                <CardDescription>
                  {restaurants?.find(r => r.id === selectedRestaurant)?.name} 的優惠券
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    新增優惠券
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>{editingId ? "編輯優惠券" : "新增優惠券"}</DialogTitle>
                      <DialogDescription>
                        設定優惠券的內容，轉盤優惠券當天 24:00 自動失效
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">優惠券標題 *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="例如：消費滿百折十元"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">優惠內容 *</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="詳細說明優惠內容與使用方式"
                          rows={4}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="imageUrl">優惠券圖片 URL</Label>
                        <Input
                          id="imageUrl"
                          placeholder="https://example.com/coupon.jpg"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        />
                        {formData.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={formData.imageUrl} 
                              alt="預覽" 
                              className="w-32 h-32 object-cover rounded border"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/128?text=Invalid+URL';
                              }}
                            />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">請輸入圖片的完整 URL（建議使用 Imgur、Google Drive 等圖床）</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">優惠類型 *</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="discount">折扣</SelectItem>
                            <SelectItem value="gift">贈品</SelectItem>
                            <SelectItem value="cashback">現金回饋</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isCheckInReward"
                          checked={formData.isCheckInReward}
                          onCheckedChange={(checked) => setFormData({ ...formData, isCheckInReward: checked })}
                        />
                        <Label htmlFor="isCheckInReward">是否為簽到獎勵優惠券</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        簽到獎勵優惠券：連續簽到 7 天的使用者會隨機獲得，有效期限為獲得後 7 天
                      </p>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        />
                        <Label htmlFor="isActive">啟用此優惠券</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        取消
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingId ? "更新" : "新增"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>圖片</TableHead>
                    <TableHead>標題</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>獎勵類型</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons?.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        {coupon.imageUrl ? (
                          <img 
                            src={coupon.imageUrl} 
                            alt={coupon.title}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/64?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-muted-foreground">
                            無圖片
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-primary" />
                          {coupon.title}
                        </div>
                      </TableCell>
                      <TableCell>{getCouponTypeLabel(coupon.type)}</TableCell>
                      <TableCell>
                        {coupon.isCheckInReward ? "簽到獎勵" : "轉盤優惠"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          coupon.isActive 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}>
                          {coupon.isActive ? "啟用" : "停用"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {coupons?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        此店家尚無優惠券，請點擊上方按鈕新增
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
