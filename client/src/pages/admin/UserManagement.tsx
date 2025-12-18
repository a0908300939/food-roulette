import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Eye, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loginMethodFilter, setLoginMethodFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // 查詢所有使用者
  const { data: users = [], isLoading, refetch } = trpc.users.list.useQuery();

  // 查詢選中使用者的詳細資訊
  const { data: userDetail } = trpc.users.getById.useQuery(
    { id: selectedUserId! },
    { enabled: selectedUserId !== null }
  );

  // 查詢選中使用者的活動記錄
  const { data: userActivity } = trpc.users.getActivity.useQuery(
    { userId: selectedUserId! },
    { enabled: selectedUserId !== null }
  );

  // 更新使用者角色
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("使用者角色已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 篩選使用者
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLoginMethod =
      loginMethodFilter === "all" || user.loginMethod === loginMethodFilter;
    return matchesSearch && matchesLoginMethod;
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

  // 切換使用者角色
  const handleToggleRole = (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>使用者管理</CardTitle>
        <CardDescription>查看所有註冊使用者的資訊與活動記錄</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 搜尋與篩選區 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋使用者名稱或 Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={loginMethodFilter} onValueChange={setLoginMethodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="登入方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部登入方式</SelectItem>
              <SelectItem value="manus">Manus</SelectItem>
              <SelectItem value="line">LINE</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>姓名</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>登入方式</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>註冊時間</TableHead>
                  <TableHead>最後登入</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.loginMethod || "未知"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          管理員
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <UserIcon className="h-3 w-3 mr-1" />
                          一般使用者
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>{formatDate(user.lastSignedIn)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              詳情
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>使用者詳細資訊</DialogTitle>
                              <DialogDescription>
                                查看使用者的完整資料與活動記錄
                              </DialogDescription>
                            </DialogHeader>
                            {userDetail && (
                              <div className="space-y-6">
                                {/* 基本資訊 */}
                                <div>
                                  <h3 className="font-semibold mb-3">基本資訊</h3>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">姓名：</span>
                                      <span className="font-medium">{userDetail.name || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Email：</span>
                                      <span className="font-medium">{userDetail.email || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">登入方式：</span>
                                      <Badge variant="outline" className="ml-2 capitalize">
                                        {userDetail.loginMethod || "未知"}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">角色：</span>
                                      {userDetail.role === "admin" ? (
                                        <Badge className="ml-2 bg-amber-500">管理員</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="ml-2">一般使用者</Badge>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">註冊時間：</span>
                                      <span className="font-medium">{formatDate(userDetail.createdAt)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">最後登入：</span>
                                      <span className="font-medium">{formatDate(userDetail.lastSignedIn)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 活動統計 */}
                                {userActivity && (
                                  <div>
                                    <h3 className="font-semibold mb-3">活動統計</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                      <Card>
                                        <CardHeader className="pb-2">
                                          <CardDescription>轉盤使用次數</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="text-2xl font-bold">{userActivity.spinCount}</div>
                                        </CardContent>
                                      </Card>
                                      <Card>
                                        <CardHeader className="pb-2">
                                          <CardDescription>獲得優惠券</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="text-2xl font-bold">{userActivity.couponCount}</div>
                                        </CardContent>
                                      </Card>
                                      <Card>
                                        <CardHeader className="pb-2">
                                          <CardDescription>已兌換優惠券</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="text-2xl font-bold">{userActivity.redeemedCount}</div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </div>
                                )}

                                {/* 最近活動記錄 */}
                                {userActivity && userActivity.recentSpins.length > 0 && (
                                  <div>
                                    <h3 className="font-semibold mb-3">最近轉盤記錄（最多 10 筆）</h3>
                                    <div className="border rounded-lg">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>時間</TableHead>
                                            <TableHead>店家</TableHead>
                                            <TableHead>優惠券</TableHead>
                                            <TableHead>狀態</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {userActivity.recentSpins.map((spin) => (
                                            <TableRow key={spin.id}>
                                              <TableCell className="text-sm">
                                                {formatDate(spin.createdAt)}
                                              </TableCell>
                                              <TableCell>{spin.restaurantName}</TableCell>
                                              <TableCell>{spin.couponTitle}</TableCell>
                                              <TableCell>
                                                {spin.isRedeemed ? (
                                                  <Badge variant="default">已兌換</Badge>
                                                ) : spin.isExpired ? (
                                                  <Badge variant="secondary">已過期</Badge>
                                                ) : (
                                                  <Badge variant="outline">未使用</Badge>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant={user.role === "admin" ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleRole(user.id, user.role)}
                          disabled={updateRoleMutation.isPending}
                        >
                          {updateRoleMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.role === "admin" ? (
                            "移除管理員"
                          ) : (
                            "設為管理員"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 統計資訊 */}
        <div className="mt-6 flex justify-between items-center text-sm text-muted-foreground">
          <div>
            共 {filteredUsers.length} 位使用者
            {searchTerm || loginMethodFilter !== "all" ? ` （已篩選）` : ""}
          </div>
          <div>
            管理員：{users.filter((u) => u.role === "admin").length} 位 | 一般使用者：
            {users.filter((u) => u.role === "user").length} 位
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
