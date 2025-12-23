import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  OperatingHoursEditor, 
  convertLegacyToNewFormat, 
  convertNewFormatToJSON,
  type WeekSchedule as NewWeekSchedule 
} from "@/components/OperatingHoursEditor";

interface RestaurantFormData {
  name: string;
  address: string;
  latitude?: string;
  longitude?: string;
  phone?: string;
  description?: string;
  photoUrl?: string;
  operatingHours: string;
  isActive: boolean;
}

interface DaySchedule {
  isClosed: boolean;
  startTime: string;
  endTime: string;
}

interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const defaultDaySchedule: DaySchedule = {
  isClosed: false,
  startTime: "10:00",
  endTime: "22:00",
};

const defaultWeekSchedule: WeekSchedule = {
  monday: { ...defaultDaySchedule },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { ...defaultDaySchedule },
  sunday: { ...defaultDaySchedule },
};

const dayNames: { key: keyof WeekSchedule; label: string }[] = [
  { key: "monday", label: "星期一" },
  { key: "tuesday", label: "星期二" },
  { key: "wednesday", label: "星期三" },
  { key: "thursday", label: "星期四" },
  { key: "friday", label: "星期五" },
  { key: "saturday", label: "星期六" },
  { key: "sunday", label: "星期日" },
];

export default function RestaurantManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    phone: "",
    description: "",
    photoUrl: "",
    operatingHours: JSON.stringify(convertScheduleToJSON(defaultWeekSchedule)),
    isActive: true,
  });
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(defaultWeekSchedule);
  const [newWeekSchedule, setNewWeekSchedule] = useState<NewWeekSchedule>(convertLegacyToNewFormat(JSON.stringify(convertScheduleToJSON(defaultWeekSchedule))));

  const utils = trpc.useUtils();
  const { data: restaurants, isLoading } = trpc.restaurants.list.useQuery();
  
  const createMutation = trpc.restaurants.create.useMutation({
    onSuccess: () => {
      utils.restaurants.list.invalidate();
      toast.success("店家新增成功");
      resetForm();
    },
    onError: (error) => {
      toast.error(`新增失敗：${error.message}`);
    },
  });

  const updateMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => {
      utils.restaurants.list.invalidate();
      toast.success("店家更新成功");
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteMutation = trpc.restaurants.delete.useMutation({
    onSuccess: () => {
      utils.restaurants.list.invalidate();
      toast.success("店家刪除成功");
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const uploadPhotoMutation = trpc.restaurants.uploadPhoto.useMutation({
    onSuccess: () => {
      utils.restaurants.list.invalidate();
    },
    onError: (error) => {
      toast.error(`照片上傳失敗：${error.message}`);
    },
  });

  // 將 WeekSchedule 轉換為 JSON 字串格式
  function convertScheduleToJSON(schedule: WeekSchedule): Record<string, string> {
    const result: Record<string, string> = {};
    Object.entries(schedule).forEach(([day, daySchedule]) => {
      if (daySchedule.isClosed) {
        result[day] = "closed";
      } else {
        result[day] = `${daySchedule.startTime}-${daySchedule.endTime}`;
      }
    });
    return result;
  }

  // 將 JSON 字串格式轉換為 WeekSchedule
  function parseJSONToSchedule(jsonStr: string): WeekSchedule {
    try {
      const parsed = JSON.parse(jsonStr);
      const schedule: WeekSchedule = { ...defaultWeekSchedule };
      
      Object.entries(parsed).forEach(([day, value]) => {
        if (day in schedule) {
          const dayKey = day as keyof WeekSchedule;
          if (value === "closed") {
            schedule[dayKey] = { isClosed: true, startTime: "10:00", endTime: "22:00" };
          } else {
            const [start, end] = (value as string).split("-");
            schedule[dayKey] = { isClosed: false, startTime: start, endTime: end };
          }
        }
      });
      
      return schedule;
    } catch {
      return defaultWeekSchedule;
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      phone: "",
      description: "",
      photoUrl: "",
      operatingHours: JSON.stringify(convertScheduleToJSON(defaultWeekSchedule)),
      isActive: true,
    });
    setWeekSchedule(defaultWeekSchedule);
    setNewWeekSchedule(convertLegacyToNewFormat(JSON.stringify(convertScheduleToJSON(defaultWeekSchedule))));
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 使用新的兩班制格式
    const updatedFormData = {
      ...formData,
      operatingHours: convertNewFormatToJSON(newWeekSchedule),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...updatedFormData });
    } else {
      createMutation.mutate(updatedFormData);
    }
  };

  const handleEdit = (restaurant: any) => {
    setEditingId(restaurant.id);
    setNewWeekSchedule(convertLegacyToNewFormat(restaurant.operatingHours));
    setFormData({
      name: restaurant.name,
      address: restaurant.address,
      latitude: restaurant.latitude || "",
      longitude: restaurant.longitude || "",
      phone: restaurant.phone || "",
      description: restaurant.description || "",
      photoUrl: restaurant.photoUrl || "",
      operatingHours: restaurant.operatingHours,
      isActive: restaurant.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此店家嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  const updateDaySchedule = (day: keyof WeekSchedule, field: keyof DaySchedule, value: any) => {
    setWeekSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const copyToAllDays = (sourceDay: keyof WeekSchedule) => {
    const sourceDaySchedule = weekSchedule[sourceDay];
    const newSchedule: WeekSchedule = { ...weekSchedule };
    dayNames.forEach(({ key }) => {
      newSchedule[key] = { ...sourceDaySchedule };
    });
    setWeekSchedule(newSchedule);
    toast.success("已套用到所有天");
  };

  if (isLoading) {
    return <div className="text-center py-8">載入中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>店家管理</CardTitle>
            <CardDescription>新增、編輯或刪除合作店家資訊</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                新增店家
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingId ? "編輯店家" : "新增店家"}</DialogTitle>
                  <DialogDescription>
                    填寫店家的基本資訊與營業時間
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* 基本資訊 */}
                  <div className="grid gap-4">
                    <h3 className="font-semibold text-sm">基本資訊</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="name">店家名稱 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">地址 *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="latitude">緯度</Label>
                        <Input
                          id="latitude"
                          value={formData.latitude}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          placeholder="23.9609"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="longitude">經度</Label>
                        <Input
                          id="longitude"
                          value={formData.longitude}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          placeholder="120.6869"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">電話</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="049-2345678"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">店家簡介</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="photoUrl">店家照片 URL</Label>
                      <Input
                        id="photoUrl"
                        placeholder="https://example.com/image.jpg"
                        value={formData.photoUrl}
                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      />
                      {formData.photoUrl && (
                        <div className="mt-2">
                          <img 
                            src={formData.photoUrl} 
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
                  </div>

                  {/* 營業時間 */}
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">營業時間設定</h3>
                    </div>
                    <OperatingHoursEditor
                      value={newWeekSchedule}
                      onChange={setNewWeekSchedule}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">啟用此店家</Label>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>照片</TableHead>
              <TableHead>店家名稱</TableHead>
              <TableHead>地址</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants?.map((restaurant) => (
              <TableRow key={restaurant.id}>
                <TableCell>
                  {restaurant.photoUrl ? (
                    <img 
                      src={restaurant.photoUrl} 
                      alt={restaurant.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/64?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-muted-foreground">
                      無照片
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{restaurant.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3" />
                    {restaurant.address}
                  </div>
                </TableCell>
                <TableCell>
                  {restaurant.phone && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3" />
                      {restaurant.phone}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    restaurant.isActive 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}>
                    {restaurant.isActive ? "啟用" : "停用"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(restaurant)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(restaurant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {restaurants?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  尚無店家資料，請點擊上方按鈕新增
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
