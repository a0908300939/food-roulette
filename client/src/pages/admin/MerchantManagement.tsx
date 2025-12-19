import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";

interface Merchant {
  id: number;
  userId: number;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  status: "active" | "suspended" | "inactive";
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  restaurants?: Restaurant[];
}

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  isActive: boolean;
}

interface User {
  openId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export default function MerchantManagement() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  // Using toast from sonner

  const [formData, setFormData] = useState({
    userId: "",
    name: "",
    contactPhone: "",
    contactEmail: "",
    status: "active" as "active" | "suspended" | "inactive",
    notes: "",
  });

  const [bindRestaurantId, setBindRestaurantId] = useState("");

  useEffect(() => {
    loadMerchants();
    loadRestaurants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch("/api/merchant-admin/merchants", {
        headers: {
          "x-user-openid": openId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load merchants");
      }

      const data = await response.json();
      setMerchants(data);
    } catch (error) {
      console.error("Failed to load merchants:", error);
      toast.error("載入失敗：無法載入商家列表");
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurants = async () => {
    try {
      const response = await fetch("/api/trpc/admin.getAllRestaurants");
      if (!response.ok) {
        throw new Error("Failed to load restaurants");
      }
      const data = await response.json();
      setRestaurants(data.result?.data || []);
    } catch (error) {
      console.error("Failed to load restaurants:", error);
    }
  };

  const handleCreate = async () => {
    try {
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch("/api/merchant-admin/merchants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-openid": openId || "",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create merchant");
      }

      toast.success("商家帳號已建立");

      setShowCreateDialog(false);
      resetForm();
      loadMerchants();
    } catch (error: any) {
      console.error("Failed to create merchant:", error);
      toast.error(`建立失敗：${error.message}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMerchant) return;

    try {
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch(`/api/merchant-admin/merchants/${selectedMerchant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-openid": openId || "",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update merchant");
      }

      toast.success("商家資訊已更新");

      setShowEditDialog(false);
      resetForm();
      loadMerchants();
    } catch (error) {
      console.error("Failed to update merchant:", error);
      toast.error("更新失敗：無法更新商家資訊");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此商家帳號嗎？")) return;

    try {
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch(`/api/merchant-admin/merchants/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-openid": openId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete merchant");
      }

      toast.success("商家帳號已刪除");

      loadMerchants();
    } catch (error) {
      console.error("Failed to delete merchant:", error);
      toast.error("刪除失敗：無法刪除商家帳號");
    }
  };

  const handleBindRestaurant = async () => {
    if (!selectedMerchant || !bindRestaurantId) return;

    try {
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch(`/api/merchant-admin/merchants/${selectedMerchant.id}/restaurants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-openid": openId || "",
        },
        body: JSON.stringify({ restaurantId: parseInt(bindRestaurantId) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to bind restaurant");
      }

      toast.success("店鋪已綁定到商家");

      setShowBindDialog(false);
      setBindRestaurantId("");
      loadMerchants();
    } catch (error: any) {
      console.error("Failed to bind restaurant:", error);
      toast.error(`綁定失敗：${error.message}`);
    }
  };

  const handleUnbindRestaurant = async (merchantId: number, restaurantId: number) => {
    if (!confirm("確定要解除此店鋪的綁定嗎？")) return;

    try {
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch(`/api/merchant-admin/merchants/${merchantId}/restaurants/${restaurantId}`, {
        method: "DELETE",
        headers: {
          "x-user-openid": openId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to unbind restaurant");
      }

      toast.success("店鋪綁定已解除");

      loadMerchants();
    } catch (error) {
      console.error("Failed to unbind restaurant:", error);
      toast.error("解除失敗：無法解除店鋪綁定");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setFormData({
      userId: merchant.userId.toString(),
      name: merchant.name,
      contactPhone: merchant.contactPhone || "",
      contactEmail: merchant.contactEmail || "",
      status: merchant.status,
      notes: merchant.notes || "",
    });
    setShowEditDialog(true);
  };

  const openBindDialog = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setBindRestaurantId("");
    setShowBindDialog(true);
  };

  const resetForm = () => {
    setFormData({
      userId: "",
      name: "",
      contactPhone: "",
      contactEmail: "",
      status: "active",
      notes: "",
    });
    setSelectedMerchant(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">啟用</Badge>;
      case "suspended":
        return <Badge className="bg-yellow-500">停權</Badge>;
      case "inactive":
        return <Badge className="bg-gray-500">停用</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">商家管理</h2>
          <p className="text-gray-500">管理商家帳號和店鋪綁定</p>
        </div>
        <Button onClick={openCreateDialog}>新增商家</Button>
      </div>

      <div className="grid gap-4">
        {merchants.map((merchant) => (
          <Card key={merchant.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{merchant.name}</CardTitle>
                  <CardDescription>
                    ID: {merchant.id} | 使用者 ID: {merchant.userId}
                  </CardDescription>
                </div>
                {getStatusBadge(merchant.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">聯絡電話：</span>
                    {merchant.contactPhone || "未設定"}
                  </div>
                  <div>
                    <span className="font-medium">聯絡信箱：</span>
                    {merchant.contactEmail || "未設定"}
                  </div>
                </div>

                {merchant.notes && (
                  <div className="text-sm">
                    <span className="font-medium">備註：</span>
                    <p className="text-gray-600 mt-1">{merchant.notes}</p>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">管理的店鋪 ({merchant.restaurants?.length || 0})</span>
                    <Button size="sm" variant="outline" onClick={() => openBindDialog(merchant)}>
                      綁定店鋪
                    </Button>
                  </div>
                  {merchant.restaurants && merchant.restaurants.length > 0 ? (
                    <div className="space-y-2">
                      {merchant.restaurants.map((restaurant) => (
                        <div
                          key={restaurant.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <span className="font-medium">{restaurant.name}</span>
                            <span className="text-sm text-gray-500 ml-2">{restaurant.address}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnbindRestaurant(merchant.id, restaurant.id)}
                          >
                            解除綁定
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">尚未綁定任何店鋪</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(merchant)}>
                    編輯
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(merchant.id)}>
                    刪除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {merchants.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              尚未建立任何商家帳號
            </CardContent>
          </Card>
        )}
      </div>

      {/* 建立商家對話框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增商家</DialogTitle>
            <DialogDescription>建立新的商家帳號</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userId">使用者 OpenID *</Label>
              <Input
                id="userId"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                placeholder="輸入使用者的 OpenID"
              />
            </div>
            <div>
              <Label htmlFor="name">商家名稱 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="輸入商家名稱"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">聯絡電話</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="輸入聯絡電話"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">聯絡信箱</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="輸入聯絡信箱"
              />
            </div>
            <div>
              <Label htmlFor="status">狀態</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">啟用</SelectItem>
                  <SelectItem value="suspended">停權</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="輸入備註"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>建立</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯商家對話框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯商家</DialogTitle>
            <DialogDescription>更新商家資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">商家名稱 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="輸入商家名稱"
              />
            </div>
            <div>
              <Label htmlFor="edit-contactPhone">聯絡電話</Label>
              <Input
                id="edit-contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="輸入聯絡電話"
              />
            </div>
            <div>
              <Label htmlFor="edit-contactEmail">聯絡信箱</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="輸入聯絡信箱"
              />
            </div>
            <div>
              <Label htmlFor="edit-status">狀態</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">啟用</SelectItem>
                  <SelectItem value="suspended">停權</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-notes">備註</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="輸入備註"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 綁定店鋪對話框 */}
      <Dialog open={showBindDialog} onOpenChange={setShowBindDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>綁定店鋪</DialogTitle>
            <DialogDescription>為商家綁定店鋪</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="restaurant">選擇店鋪</Label>
              <Select value={bindRestaurantId} onValueChange={setBindRestaurantId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇店鋪" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                      {restaurant.name} - {restaurant.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBindDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBindRestaurant} disabled={!bindRestaurantId}>
              綁定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
