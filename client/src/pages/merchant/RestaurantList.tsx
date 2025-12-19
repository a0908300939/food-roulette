import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Store, MapPin, Phone, Clock, Edit } from "lucide-react";
import { Link } from "wouter";

export default function MerchantRestaurantList() {
  const { data: restaurants, isLoading } = trpc.merchant.getMyRestaurants.useQuery();

  if (isLoading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">我的店鋪</h1>
        <p className="text-muted-foreground mt-2">
          管理您的所有店鋪資訊
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {restaurants?.map((restaurant) => (
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
                <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                  {restaurant.isActive ? "營業中" : "已停業"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {restaurant.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{restaurant.address}</span>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{restaurant.phone}</span>
                </div>
              )}
              {restaurant.operatingHours && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-muted-foreground">營業時間已設定</span>
                </div>
              )}
              <div className="pt-4 flex gap-2">
                <Link href={`/merchant/restaurants/${restaurant.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    編輯資訊
                  </Button>
                </Link>
                <Link href={`/merchant/statistics?restaurantId=${restaurant.id}`} className="flex-1">
                  <Button className="w-full">
                    查看數據
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!restaurants || restaurants.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">尚未綁定任何店鋪</h3>
              <p className="text-muted-foreground">
                請聯絡管理員為您的帳號綁定店鋪
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
