import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Edit, ShieldCheck, User as UserIcon, Store } from "lucide-react";
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
          <Badge className="bg-amber-500 hover:bg-amber-600">
            <ShieldCheck className="h-3 w-3 mr-1" />
            系統管理員
          </Badge>
        );
      case "merchant":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">
            <Store className="h-3 w-3 mr-1" />
            商家擁有者
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <UserIcon className="h-3 w-3 mr-1" />
            一般使用者
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>使用者管理</CardTitle>
        <CardDescription>管理使用者角色與商家權限</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 搜尋區 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋使用者名稱、Email 或電話..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 使用者列表 */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>沒有找到符合條件的使用者</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email / 電話</TableHead>
                  <TableHead>登入方式</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>管理的商家</TableHead>
                  <TableHead>註冊時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.email || user.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.loginMethod || "未知"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.restaurantIds && user.restaurantIds.length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {user.restaurantIds.length} 家商家
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編輯
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 編輯對話框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>編輯使用者</DialogTitle>
              <DialogDescription>
                設定使用者角色與商家權限
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* 使用者資訊 */}
                <div>
                  <Label className="text-sm font-medium">使用者資訊</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                    <div>Email / 電話：{selectedUser.email || selectedUser.phone}</div>
                    <div className="text-muted-foreground">
                      註冊時間：{formatDate(selectedUser.createdAt)}
                    </div>
                  </div>
                </div>

                {/* 角色選擇 */}
                <div>
                  <Label htmlFor="role">角色</Label>
                  <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                    <SelectTrigger id="role" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          一般使用者
                        </div>
                      </SelectItem>
                      <SelectItem value="merchant">
                        <div className="flex items-center">
                          <Store className="h-4 w-4 mr-2" />
                          商家擁有者
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center">
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          系統管理員
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRole === "admin" && "系統管理員可以管理所有商家和使用者"}
                    {selectedRole === "merchant" && "商家擁有者只能管理被指派的商家"}
                    {selectedRole === "user" && "一般使用者只能使用轉盤功能"}
                  </p>
                </div>

                {/* 商家選擇（只有 merchant 角色才顯示） */}
                {selectedRole === "merchant" && (
                  <div>
                    <Label>管理的商家</Label>
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                      {restaurants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">尚無商家資料</p>
                      ) : (
                        restaurants.map((restaurant: any) => (
                          <div key={restaurant.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`restaurant-${restaurant.id}`}
                              checked={selectedRestaurantIds.includes(restaurant.id)}
                              onCheckedChange={() => toggleRestaurant(restaurant.id)}
                            />
                            <label
                              htmlFor={`restaurant-${restaurant.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {restaurant.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      選擇此使用者可以管理的商家（可多選）
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={updateRoleMutation.isPending || assignRestaurantsMutation.isPending}>
                {(updateRoleMutation.isPending || assignRestaurantsMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
