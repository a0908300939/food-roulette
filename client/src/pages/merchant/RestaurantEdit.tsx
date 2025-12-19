import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function MerchantRestaurantEdit() {
  const [, params] = useRoute("/merchant/restaurants/:id");
  const [, setLocation] = useLocation();
  const restaurantId = params?.id ? parseInt(params.id) : null;

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    description: "",
    photoUrl: "",
    isActive: true,
  });

  const { data: restaurant, isLoading } = trpc.merchant.getRestaurant.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId }
  );

  const utils = trpc.useUtils();
  const updateMutation = trpc.merchant.updateRestaurant.useMutation({
    onSuccess: () => {
      utils.merchant.getMyRestaurants.invalidate();
      utils.merchant.getRestaurant.invalidate();
      toast.success("店鋪資訊更新成功");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        description: restaurant.description || "",
        photoUrl: restaurant.photoUrl || "",
        isActive: restaurant.isActive,
      });
    }
  }, [restaurant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!restaurantId) {
      toast.error("店鋪 ID 無效");
      return;
    }

    if (!formData.name || !formData.address) {
      toast.error("請填寫店鋪名稱和地址");
      return;
    }

    updateMutation.mutate({
      restaurantId,
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      description: formData.description,
      photoUrl: formData.photoUrl,
      isActive: formData.isActive,
    });
  };

  if (isLoading) {
    return <div className="p-8">載入中...</div>;
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">找不到店鋪</h3>
            <p className="text-muted-foreground mb-4">
              您可能沒有權限存取此店鋪，或店鋪不存在
            </p>
            <Button onClick={() => setLocation("/merchant/restaurants")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回店鋪列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/merchant/restaurants")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold">編輯店鋪資訊</h1>
          <p className="text-muted-foreground mt-2">
            更新您的店鋪基本資訊（不含機率設定）
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本資訊</CardTitle>
            <CardDescription>
              店鋪的基本資料和聯絡方式
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">店鋪名稱 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">地址 *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">店鋪描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="介紹您的店鋪特色..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoUrl">店鋪照片網址</Label>
              <Input
                id="photoUrl"
                type="url"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
              {formData.photoUrl && (
                <div className="mt-2">
                  <img
                    src={formData.photoUrl}
                    alt="店鋪照片預覽"
                    className="max-w-xs rounded-md border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">營業狀態</Label>
                <p className="text-sm text-muted-foreground">
                  關閉後店鋪將不會出現在轉盤中
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              權限說明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>✓ 您可以編輯店鋪的基本資訊（名稱、地址、電話等）</li>
              <li>✓ 您可以管理店鋪的優惠券</li>
              <li>✓ 您可以查看店鋪的數據統計</li>
              <li>✗ 您無法調整店鋪在轉盤中的機率（僅管理員可調整）</li>
              <li>✗ 您無法刪除店鋪（請聯絡管理員）</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/merchant/restaurants")}
          >
            取消
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "儲存中..." : "儲存變更"}
          </Button>
        </div>
      </form>
    </div>
  );
}
