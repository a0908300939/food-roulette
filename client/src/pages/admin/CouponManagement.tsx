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
import { Slider } from "@/components/ui/slider";

interface CouponFormData {
  restaurantId: number;
  title: string;
  description: string;
  imageUrl?: string;
  type: "discount" | "gift" | "cashback" | "check_in_reward";
  isCheckInReward: boolean;
  weight: number;
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
    weight: 5,
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
      weight: 5,
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
      weight: coupon.weight || 5,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {restaurants?.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => setSelectedRestaurant(restaurant.id)}
                className={`p-4 sm:p-6 rounded-xl border-2 text-left transition-all ${
                  selectedRestaurant === restaurant.id
                    ? "bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-900/20"
                    : "bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 dark:bg-gray-800 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectedRestaurant === restaurant.id && (
                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                  )}
                  <span className="text-base sm:text-lg font-semibold">{restaurant.name}</span>
                </div>
              </button>
            ))}
          </div>
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
                        <div className="flex items-center justify-between">
                          <Label htmlFor="description">優惠內容 *</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!formData.title) {
                                toast.error('請先輸入優惠券標題');
                                return;
                              }
                              try {
                                toast.info('正在生成優惠內容...');
                                const result = await trpc.coupons.generateDescription.mutate({
                                  title: formData.title,
                                });
                                setFormData({ ...formData, description: result.description });
                                toast.success('AI 生成成功！');
                              } catch (error: any) {
                                toast.error(error.message || 'AI 生成失敗');
                              }
                            }}
                            className="text-xs"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI 協作
                          </Button>
                        </div>
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
                        <Label htmlFor="imageUrl">優惠券圖片</Label>
                        <div className="flex gap-2 items-start">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              // 驗證檔案大小 (2MB)
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('圖片檔案過大，請選擇小於 2MB 的圖片');
                                return;
                              }
                              
                              // 轉換為 base64
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64 = reader.result as string;
                                setFormData({ ...formData, imageUrl: base64 });
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="flex-1"
                          />
                          {formData.imageUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({ ...formData, imageUrl: "" })}
                            >
                              清除
                            </Button>
                          )}
                        </div>
                        {formData.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={formData.imageUrl} 
                              alt="預覽" 
                              className="w-32 h-32 object-cover rounded border"
                            />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">支援 JPG、PNG、WebP 格式，檔案大小不超過 2MB（建議尺寸：800×600 像素）</p>
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
                      
                      {/* 曝光權重 */}
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="weight">曝光權重</Label>
                          <span className="text-2xl font-bold text-primary">{formData.weight}</span>
                        </div>
                        <Slider
                          id="weight"
                          min={1}
                          max={10}
                          step={1}
                          value={[formData.weight]}
                          onValueChange={(value) => setFormData({ ...formData, weight: value[0] })}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 (低)</span>
                          <span>5 (中)</span>
                          <span>10 (高)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          權重越高，轉盤中出現的機率越大。例如權重 5 的優惠券會比權重 1 的優惠券出現 5 倍。
                        </p>
                      </div>
                      
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
            ) : coupons && coupons.length > 0 ? (
              <div className="space-y-4">
                {coupons.map((coupon) => (
                  <Card 
                    key={coupon.id} 
                    className="overflow-hidden hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => handleEdit(coupon)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        {/* 圖片 */}
                        <div className="flex-shrink-0">
                          {coupon.imageUrl ? (
                            <img 
                              src={coupon.imageUrl} 
                              alt={coupon.title}
                              className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/128?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <Ticket className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* 內容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-lg sm:text-xl font-bold line-clamp-2">{coupon.title}</h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${
                              coupon.isActive 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}>
                              {coupon.isActive ? "啟用" : "停用"}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full font-medium">
                              {getCouponTypeLabel(coupon.type)}
                            </span>
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full font-medium">
                              {coupon.isCheckInReward ? "簽到獎勵" : "轉盤優惠"}
                            </span>
                          </div>
                          
                          {coupon.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {coupon.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* 按鈕區 */}
                      <div className="border-t bg-gray-50 dark:bg-gray-800/50 p-4 flex gap-3">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(coupon);
                          }}
                          className="flex-1 h-14 rounded-xl border-2 bg-white hover:bg-orange-50 hover:border-orange-500 hover:text-orange-600 text-base font-semibold"
                        >
                          <Pencil className="h-5 w-5 mr-2" />
                          編輯優惠券
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(coupon.id);
                          }}
                          className="flex-1 h-14 rounded-xl border-2 bg-white hover:bg-red-50 hover:border-red-500 hover:text-red-600 text-base font-semibold"
                        >
                          <Trash2 className="h-5 w-5 mr-2" />
                          刪除優惠券
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  此店家尚無優惠券，請點擊上方按鈕新增
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
