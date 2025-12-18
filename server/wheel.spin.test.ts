import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: 'user' | 'admin' = 'user'): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "simple",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("wheel.spin - 簽到獎勵優惠券過濾測試", () => {
  it("getCouponsByRestaurantId 應該永遠不返回簽到獎勵優惠券", async () => {
    // 查詢所有店家
    const restaurants = await db.getActiveRestaurantsWithCoupons();
    
    for (const restaurant of restaurants) {
      const coupons = await db.getCouponsByRestaurantId(restaurant.id);
      
      // 驗證：所有優惠券的 isCheckInReward 都應該是 false
      const hasCheckInReward = coupons.some(c => c.isCheckInReward);
      expect(hasCheckInReward).toBe(false);
      
      console.log(`✅ 店家「${restaurant.name}」的優惠券中沒有簽到獎勵券（共 ${coupons.length} 張）`);
    }
  });

  it("getActiveRestaurantsWithCoupons 應該永遠不返回簽到獎勵優惠券", async () => {
    const restaurants = await db.getActiveRestaurantsWithCoupons();
    
    for (const restaurant of restaurants) {
      const coupons = restaurant.coupons || [];
      
      // 驗證：所有優惠券的 isCheckInReward 都應該是 false
      const hasCheckInReward = coupons.some(c => c.isCheckInReward);
      expect(hasCheckInReward).toBe(false);
      
      console.log(`✅ 店家「${restaurant.name}」的優惠券列表中沒有簽到獎勵券（共 ${coupons.length} 張）`);
    }
  });

  it("wheel.spin API 應該永遠不返回簽到獎勵優惠券", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext('admin'); // 使用管理員帳號避免次數限制
    const caller = appRouter.createCaller(ctx);
    
    // 查詢所有營業中的店家
    const restaurants = await db.getActiveRestaurantsWithCoupons();
    const restaurantIds = restaurants.map(r => r.id);
    
    if (restaurantIds.length === 0) {
      console.log('⚠️ 沒有營業中的店家，跳過測試');
      return;
    }
    
    // 進行 10 次抽獎測試
    const testCount = 10;
    console.log(`\n開始進行 ${testCount} 次抽獎測試...\n`);
    
    for (let i = 0; i < testCount; i++) {
      const result = await caller.spin.draw({
        restaurantIds,
        mealPeriod: 'lunch',
      });
      
      // 驗證：如果有優惠券，絕對不能是簽到獎勵券
      if (result.coupon) {
        expect(result.coupon.isCheckInReward).toBe(false);
        console.log(`  第 ${i + 1} 次：✅ ${result.restaurant.name} - ${result.coupon.title}`);
      } else {
        console.log(`  第 ${i + 1} 次：⚠️ ${result.restaurant.name} - 無優惠券`);
      }
    }
    
    console.log(`\n✅ ${testCount} 次抽獎測試全部通過，沒有出現簽到獎勵優惠券！\n`);
  });
});
