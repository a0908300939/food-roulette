import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Store, User, Phone, Mail, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MerchantFormData {
  phone?: string;
  email?: string;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

interface RestaurantBinding {
  restaurantId: number;
  restaurantName: string;
}

export default function MerchantManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBindDialogOpen, setIsBindDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  
  const [formData, setFormData] = useState<MerchantFormData>({
    phone: "",
    email: "",
    name: "",
    contactPhone: "",
    contactEmail: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: merchants, isLoading } = trpc.merchantAdmin.list.useQuery();
  const { data: restaurants } = trpc.restaurants.list.useQuery();
  const { data: merchantRestaurants } = trpc.merchantAdmin.getRestaurants.useQuery(
    { merchantId: selectedMerchantId! },
    { enabled: !!selectedMerchantId }
  );

  const createMutation = trpc.merchantAdmin.create.useMutation({
    onSuccess: () => {
      utils.merchantAdmin.list.invalidate();
      toast.success("商家帳號建立成功");
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "建立失敗");
    },
  });

  const updateMutation = trpc.merchantAdmin.update.useMutation({
    onSuccess: () => {
      utils.merchantAdmin.list.invalidate();
      toast.success("商家資訊更新成功");
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const deleteMutation = trpc.merchantAdmin.delete.useMutation({
    onSuccess: () => {
      utils.merchantAdmin.list.invalidate();
      toast.success("商家帳號已刪除");
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const bindMutation = trpc.merchantAdmin.bindRestaurant.useMutation({
    onSuccess: () => {
      utils.merchantAdmin.getRestaurants.invalidate();
      toast.success("店鋪綁定成功");
      setSelectedRestaurantId("");
      setIsBindDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "綁定失敗");
    },
  });

  const unbindMutation = trpc.merchantAdmin.unbindRestaurant.useMutation({
    onSuccess: () => {
      utils.merchantAdmin.getRestaurants.invalidate();
      toast.success("店鋪解除綁定成功");
    },
    onError: (error) => {
      toast.error(error.message || "解除綁定失敗");
    },
  });

  const resetForm = () => {
    setFormData({
      phone: "",
      email: "",
      name: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
    });
    setEditingId(null);
  };

  const handleCreate = () => {
    if (!formData.name || (!formData.phone && !formData.email)) {
      toast.error("請填寫商家名稱和手機或 Email");
      return;
    }

    createMutation.mutate({
      phone: formData.phone,
      email: formData.email,
      name: formData.name,
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail,
      notes: formData.notes,
    });
  };

  const handleEdit = (merchant: any) => {
    setEditingId(merchant.id);
    setFormData({
      phone: merchant.userPhone || "",
      email: merchant.userEmail || "",
      name: merchant.name,
      contactPhone: merchant.contactPhone || "",
      contactEmail: merchant.contactEmail || "",
      notes: merchant.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingId || !formData.name) {
      toast.error("請填寫商家名稱");
      return;
    }

    updateMutation.mutate({
      id: editingId,
      name: formData.name,
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail,
      notes: formData.notes,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此商家帳號嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleBindRestaurant = () => {
    if (!selectedMerchantId || !selectedRestaurantId) {
      toast.error("請選擇店鋪");
      return;
    }

    bindMutation.mutate({
      merchantId: selectedMerchantId,
      restaurantId: parseInt(selectedRestaurantId),
    });
  };

  const handleUnbindRestaurant = (merchantId: number, restaurantId: number) => {
    if (confirm("確定要解除此店鋪的綁定嗎？")) {
      unbindMutation.mutate({ merchantId, restaurantId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">啟用</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500">停權</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">停用</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">商家管理</h1>
          <p className="text-muted-foreground mt-2">
            管理商家帳號、綁定店鋪、設定權限
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增商家
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>商家列表</CardTitle>
          <CardDescription>
            共 {merchants?.length || 0} 個商家帳號
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商家名稱</TableHead>
                <TableHead>聯絡方式</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>管理店鋪數</TableHead>
                <TableHead>建立時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants?.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {merchant.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {merchant.contactPhone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {merchant.contactPhone}
                        </div>
                      )}
                      {merchant.contactEmail && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {merchant.contactEmail}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(merchant.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setSelectedMerchantId(merchant.id);
                        setIsBindDialogOpen(true);
                      }}
                    >
                      <Store className="h-4 w-4 mr-1" />
                      查看店鋪
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(merchant.createdAt).toLocaleDateString('zh-TW')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(merchant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(merchant.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!merchants || merchants.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    尚無商家帳號
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 新增商家對話框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增商家帳號</DialogTitle>
            <DialogDescription>
              建立新的商家帳號並設定基本資訊
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手機號碼 *</Label>
                <Input
                  id="phone"
                  placeholder="0912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="merchant@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">商家名稱 *</Label>
              <Input
                id="name"
                placeholder="例如：王小明、XX餐飲集團"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">聯絡電話</Label>
                <Input
                  id="contactPhone"
                  placeholder="0912345678"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">聯絡 Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                placeholder="管理員備註..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <p className="text-sm text-blue-700">
                手機號碼或 Email 至少需要填寫一項作為登入帳號
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "建立中..." : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯商家對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯商家資訊</DialogTitle>
            <DialogDescription>
              更新商家的基本資訊和聯絡方式
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">商家名稱 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contactPhone">聯絡電話</Label>
                <Input
                  id="edit-contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactEmail">聯絡 Email</Label>
                <Input
                  id="edit-contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">備註</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 店鋪綁定對話框 */}
      <Dialog open={isBindDialogOpen} onOpenChange={setIsBindDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>管理店鋪綁定</DialogTitle>
            <DialogDescription>
              為商家綁定或解除綁定店鋪
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>新增店鋪綁定</Label>
              <div className="flex gap-2">
                <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇店鋪" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants?.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleBindRestaurant} disabled={bindMutation.isPending}>
                  綁定
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>已綁定的店鋪</Label>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>店鋪名稱</TableHead>
                      <TableHead>地址</TableHead>
                      <TableHead>綁定時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchantRestaurants?.map((restaurant) => (
                      <TableRow key={restaurant.id}>
                        <TableCell className="font-medium">{restaurant.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {restaurant.address}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(restaurant.boundAt).toLocaleDateString('zh-TW')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnbindRestaurant(selectedMerchantId!, restaurant.id)}
                            disabled={unbindMutation.isPending}
                          >
                            解除綁定
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!merchantRestaurants || merchantRestaurants.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                          尚未綁定任何店鋪
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBindDialogOpen(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
