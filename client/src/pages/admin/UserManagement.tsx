import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Edit, ShieldCheck, User as UserIcon, Store, Phone, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<"user" | "merchant" | "admin">("user");
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<number[]>([]);

  // 查詢所有使用者
  const { data: users = [], isLoading, refetch } = trpc.userManagement.listUsers.useQuery();

  // 查詢所有商家
  const { data: restaurants = [] } = trpc.restaurants.list.useQuery();

  // 更新使用者角色
  const updateRoleMutation = trpc.userManagement.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("使用者角色已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 指派商家
  const assignRestaurantsMutation = trpc.userManagement.assignUserToRestaurants.useMutation({
    onSuccess: () => {
      toast.success("商家指派成功");
      refetch();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`指派失敗：${error.message}`);
    },
  });

  // 篩選使用者
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // 格式化日期
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 開啟編輯對話框
  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setSelectedRestaurantIds(user.restaurantIds || []);
    setEditDialogOpen(true);
  };

  // 儲存變更
  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      // 更新角色
      if (selectedRole !== selectedUser.role) {
        await updateRoleMutation.mutateAsync({
          userId: selectedUser.id,
          role: selectedRole,
        });
      }

      // 指派商家（只有 merchant 角色才需要）
      if (selectedRole === "merchant") {
        await assignRestaurantsMutation.mutateAsync({
          userId: selectedUser.id,
          restaurantIds: selectedRestaurantIds,
        });
      } else {
        // 如果不是 merchant，清空商家關聯
        await assignRestaurantsMutation.mutateAsync({
          userId: selectedUser.id,
          restaurantIds: [],
        });
      }
    } catch (error) {
      // 錯誤已在 mutation 中處理
    }
  };

  // 切換商家選擇
  const toggleRestaurant = (restaurantId: number) => {
    setSelectedRestaurantIds((prev) =>
      prev.includes(restaurantId)
        ? prev.filter((id) => id !== restaurantId)
        : [...prev, restaurantId]
    );
  };

  // 角色徽章
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-sm px-3 py-1">
            <ShieldCheck className="h-4 w-4 mr-1" />
            系統管理員
          </Badge>
        );
      case "merchant":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-sm px-3 py-1">
            <Store className="h-4 w-4 mr-1" />
            商家擁有者
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <UserIcon className="h-4 w-4 mr-1" />
            一般使用者
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl sm:text-3xl font-bold">使用者管理</CardTitle>
        <CardDescription className="text-base">管理使用者角色與商家權限</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 搜尋區 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="搜尋使用者名稱、Email 或電話..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-14 text-base"
            />
          </div>
        </div>

        {/* 使用者列表 - 卡片形式 */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-base">沒有找到符合條件的使用者</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user: any) => (
              <Card 
                key={user.id}
                className="border-2 hover:border-orange-300 transition-colors"
              >
                <CardContent className="p-4">
                  {/* 上方：角色徽章和編輯按鈕 */}
                  <div className="flex items-center justify-between mb-3">
                    {getRoleBadge(user.role)}
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => handleEdit(user)}
                      className="h-12 px-6 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                    >
                      <Edit className="h-5 w-5 mr-2" />
                      編輯
                    </Button>
                  </div>

                  {/* 使用者資訊 */}
                  <div className="space-y-2">
                    {/* Email */}
                    {user.email && (
                      <div className="flex items-center gap-2 text-base">
                        <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium break-all">{user.email}</span>
                      </div>
                    )}
                    
                    {/* 電話 */}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-base">
                        <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{user.phone}</span>
                      </div>
                    )}

                    {/* 下方資訊：登入方式、店舖數、註冊時間 */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t mt-3">
                      {/* 登入方式 */}
                      <Badge variant="outline" className="text-sm capitalize">
                        {user.loginMethod || "未知"}
                      </Badge>

                      {/* 店舖數 */}
                      {user.restaurantIds && user.restaurantIds.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Store className="h-4 w-4" />
                          <span>{user.restaurantIds.length} 間店舖</span>
                        </div>
                      )}

                      {/* 註冊時間 */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 編輯對話框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">編輯使用者</DialogTitle>
              <DialogDescription className="text-base">
                設定使用者角色與商家權限
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* 使用者資訊 */}
                <div>
                  <Label className="text-base font-semibold">使用者資訊</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg text-base">
                    <div className="font-medium">Email / 電話：{selectedUser.email || selectedUser.phone}</div>
                    <div className="text-muted-foreground mt-1">
                      註冊時間：{formatDate(selectedUser.createdAt)}
                    </div>
                  </div>
                </div>

                {/* 角色選擇 */}
                <div>
                  <Label htmlFor="role" className="text-base font-semibold">角色</Label>
                  <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                    <SelectTrigger id="role" className="mt-2 h-14 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user" className="text-base py-3">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 mr-2" />
                          一般使用者
                        </div>
                      </SelectItem>
                      <SelectItem value="merchant" className="text-base py-3">
                        <div className="flex items-center">
                          <Store className="h-5 w-5 mr-2" />
                          店舖擁有者
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="text-base py-3">
                        <div className="flex items-center">
                          <ShieldCheck className="h-5 w-5 mr-2" />
                          系統管理員
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedRole === "admin" && "系統管理員可以管理所有店舖和使用者"}
                    {selectedRole === "merchant" && "店舖擁有者只能管理被指派的店舖"}
                    {selectedRole === "user" && "一般使用者只能使用轉盤功能"}
                  </p>
                </div>

                {/* 商家選擇（只有 merchant 角色才顯示） */}
                {selectedRole === "merchant" && (
                  <div>
                    <Label className="text-base font-semibold">管理的店舖</Label>
                    <div className="mt-2 space-y-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                      {restaurants.length === 0 ? (
                        <p className="text-base text-muted-foreground">尚無店舖資料</p>
                      ) : (
                        restaurants.map((restaurant: any) => (
                          <div key={restaurant.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors">
                            <Checkbox
                              id={`restaurant-${restaurant.id}`}
                              checked={selectedRestaurantIds.includes(restaurant.id)}
                              onCheckedChange={() => toggleRestaurant(restaurant.id)}
                              className="h-6 w-6"
                            />
                            <label
                              htmlFor={`restaurant-${restaurant.id}`}
                              className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {restaurant.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      選擇此使用者可以管理的店舖（可多選）
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
                className="h-14 px-6 text-base flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateRoleMutation.isPending || assignRestaurantsMutation.isPending}
                className="h-14 px-6 text-base bg-orange-500 hover:bg-orange-600 flex-1"
              >
                {(updateRoleMutation.isPending || assignRestaurantsMutation.isPending) && (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                )}
                儲存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
