import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Store, MapPin, Phone, Clock } from "lucide-react";

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  description: string | null;
  photoUrl: string | null;
  operatingHours: string;
  providesCheckInReward: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MerchantRestaurantList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  // Using toast from sonner
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const openId = localStorage.getItem("userOpenId");
      const response = await fetch("/api/merchant/restaurants", {
        headers: {
          "x-user-openid": openId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load restaurants");
      }

      const data = await response.json();
      setRestaurants(data);
    } catch (error) {
      console.error("Failed to load restaurants:", error);
      toast.error("載入失敗：無法載入店鋪列表");
    } finally {
      setLoading(false);
    }
  };

  const getOperatingHoursText = (operatingHours: string) => {
    try {
      const hours = JSON.parse(operatingHours);
      const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      const todayHours = hours[today];

      if (!todayHours || todayHours === "休息") {
        return "今日公休";
      }

      if (typeof todayHours === "object" && todayHours.closed) {
        return "今日公休";
      }

      if (typeof todayHours === "object" && todayHours.shifts) {
        const shifts = todayHours.shifts.map((shift: any) => `${shift.start}-${shift.end}`).join(", ");
        return `今日營業：${shifts}`;
      }

      if (typeof todayHours === "object" && todayHours.start && todayHours.end) {
        return `今日營業：${todayHours.start}-${todayHours.end}`;
      }

      if (typeof todayHours === "string") {
        return `今日營業：${todayHours}`;
      }

      return "營業時間未設定";
    } catch (error) {
      return "營業時間格式錯誤";
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
          <h2 className="text-2xl font-bold">我的店鋪</h2>
          <p className="text-gray-500">管理您的所有店鋪</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    {restaurant.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {restaurant.description || "暫無描述"}
                  </CardDescription>
                </div>
                {restaurant.isActive ? (
                  <Badge className="bg-green-500">營業中</Badge>
                ) : (
                  <Badge className="bg-gray-500">已停用</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {restaurant.photoUrl && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={restaurant.photoUrl}
                    alt={restaurant.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600">{restaurant.address}</span>
                </div>

                {restaurant.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{restaurant.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{getOperatingHoursText(restaurant.operatingHours)}</span>
                </div>

                {restaurant.providesCheckInReward && (
                  <Badge variant="outline" className="mt-2">
                    提供簽到獎勵
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation(`/merchant/restaurant/${restaurant.id}/edit`)}
                >
                  編輯資料
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setLocation(`/merchant/restaurant/${restaurant.id}/statistics`)}
                >
                  查看數據
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {restaurants.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-16 text-center">
              <Store className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">尚未綁定任何店鋪</h3>
              <p className="text-gray-500">請聯絡管理員為您綁定店鋪</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
