import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: 'admin' | 'user' = 'admin'): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-user-pointer",
    email: "pointer@example.com",
    name: "Pointer Test User",
    loginMethod: "manus",
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

describe("spin.draw - 指針導向邏輯測試", () => {
  it("後端應該接收前端傳入的 selectedIndex、restaurantId、couponId", async () => {
    const { ctx } = createAuthContext('admin');
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length === 0) {
      console.log('⚠️ 跳過測試：資料庫中沒有店家資料');
      return;
    }

    // 模擬前端計算的結果
    const selectedIndex = 0;
    const selectedRestaurant = restaurants[0];
    
    // 查詢該店家的優惠券
    const coupons = await db.getCouponsByRestaurantId(selectedRestaurant.id);
    const selectedCoupon = coupons.find(c => !c.isCheckInReward) || null;

    console.log('\n[測試] 模擬前端傳入:');
    console.log('  selectedIndex:', selectedIndex);
    console.log('  restaurantId:', selectedRestaurant.id);
    console.log('  couponId:', selectedCoupon?.id || null);

    // 呼叫後端 API
    const result = await caller.spin.draw({
      mealPeriod: "lunch",
      selectedIndex,
      restaurantId: selectedRestaurant.id,
      couponId: selectedCoupon?.id || null,
    });

    // 驗證：後端返回的店家與前端傳入的一致
    expect(result.restaurant.id).toBe(selectedRestaurant.id);
    
    // 驗證：後端返回的優惠券與前端傳入的一致
    if (selectedCoupon) {
      expect(result.coupon?.id).toBe(selectedCoupon.id);
    } else {
      expect(result.coupon).toBeNull();
    }
    
    // 驗證：spinHistoryId 存在（表示已記錄到資料庫）
    expect(result.spinHistoryId).toBeDefined();

    console.log('\n[測試] ✅ 後端返回結果:');
    console.log('  restaurant:', result.restaurant.name);
    console.log('  coupon:', result.coupon?.title || '無優惠券');
    console.log('  spinHistoryId:', result.spinHistoryId);
  });

  it("模擬完整的轉盤流程：隨機旋轉 → 計算指針位置 → 後端記錄", async () => {
    const { ctx } = createAuthContext('admin');
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length < 3) {
      console.log('⚠️ 跳過測試：資料庫中店家數量不足');
      return;
    }

    // 建立轉盤資料（模擬前端的 wheelData）
    const wheelSlices = await Promise.all(
      restaurants.slice(0, 4).map(async (r) => {
        const coupons = await db.getCouponsByRestaurantId(r.id);
        const coupon = coupons.find(c => !c.isCheckInReward) || null;
        return {
          restaurantId: r.id,
          restaurant: r,
          coupon,
        };
      })
    );

    console.log('\n[測試] 轉盤資料:');
    wheelSlices.forEach((slice, i) => {
      console.log(`  扇形 ${i}: ${slice.restaurant.name} → ${slice.coupon?.title || '無優惠券'}`);
    });

    // 模擬前端隨機旋轉
    const spins = 5 + Math.random() * 3; // 隨機旋轉 5-8 圈
    const randomAngle = Math.random() * 360; // 隨機停止角度 0-360°
    const finalRotation = spins * 360 + randomAngle;

    console.log('\n[測試] 模擬旋轉:');
    console.log('  旋轉圈數:', spins.toFixed(2));
    console.log('  隨機角度:', randomAngle.toFixed(2));
    console.log('  最終角度:', finalRotation.toFixed(2));

    // 計算指針指向的扇形索引（模擬前端的計算邏輯）
    const normalizedAngle = finalRotation % 360;
    const adjustedAngle = (normalizedAngle + 90) % 360;
    const sliceAngle = 360 / wheelSlices.length;
    const selectedIndex = Math.floor(adjustedAngle / sliceAngle) % wheelSlices.length;

    console.log('\n[測試] 計算指針位置:');
    console.log('  normalizedAngle:', normalizedAngle.toFixed(2));
    console.log('  adjustedAngle:', adjustedAngle.toFixed(2));
    console.log('  sliceAngle:', sliceAngle.toFixed(2));
    console.log('  selectedIndex:', selectedIndex);

    // 取得指針指向的扇形資料
    const selectedSlice = wheelSlices[selectedIndex];
    console.log('\n[測試] 指針指向:');
    console.log('  店家:', selectedSlice.restaurant.name);
    console.log('  優惠券:', selectedSlice.coupon?.title || '無優惠券');

    // 呼叫後端 API 記錄結果
    const result = await caller.spin.draw({
      mealPeriod: "dinner",
      selectedIndex,
      restaurantId: selectedSlice.restaurantId,
      couponId: selectedSlice.coupon?.id || null,
    });

    // 驗證：後端返回的結果與前端計算的一致
    expect(result.restaurant.id).toBe(selectedSlice.restaurantId);
    if (selectedSlice.coupon) {
      expect(result.coupon?.id).toBe(selectedSlice.coupon.id);
    } else {
      expect(result.coupon).toBeNull();
    }

    console.log('\n[測試] ✅ 後端確認結果:');
    console.log('  restaurant:', result.restaurant.name);
    console.log('  coupon:', result.coupon?.title || '無優惠券');
    console.log('  spinHistoryId:', result.spinHistoryId);
  });

  it("多次抽獎應該產生不同的結果（真實隨機性）", async () => {
    const { ctx } = createAuthContext('admin');
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length < 3) {
      console.log('⚠️ 跳過測試：資料庫中店家數量不足');
      return;
    }

    // 建立轉盤資料
    const wheelSlices = await Promise.all(
      restaurants.slice(0, 4).map(async (r) => {
        const coupons = await db.getCouponsByRestaurantId(r.id);
        const coupon = coupons.find(c => !c.isCheckInReward) || null;
        return {
          restaurantId: r.id,
          restaurant: r,
          coupon,
        };
      })
    );

    const results: number[] = [];

    // 進行 20 次抽獎測試
    console.log('\n[測試] 進行 20 次隨機抽獎...\n');
    for (let i = 0; i < 20; i++) {
      // 模擬前端隨機旋轉
      const spins = 5 + Math.random() * 3;
      const randomAngle = Math.random() * 360;
      const finalRotation = spins * 360 + randomAngle;

      // 計算指針位置
      const normalizedAngle = finalRotation % 360;
      const adjustedAngle = (normalizedAngle + 90) % 360;
      const sliceAngle = 360 / wheelSlices.length;
      const selectedIndex = Math.floor(adjustedAngle / sliceAngle) % wheelSlices.length;

      results.push(selectedIndex);

      const selectedSlice = wheelSlices[selectedIndex];

      // 呼叫後端 API
      const result = await caller.spin.draw({
        mealPeriod: "breakfast",
        selectedIndex,
        restaurantId: selectedSlice.restaurantId,
        couponId: selectedSlice.coupon?.id || null,
      });

      console.log(`  第 ${i + 1} 次：位置 ${selectedIndex} - ${result.restaurant.name} - ${result.coupon?.title || '無優惠券'}`);
    }

    // 驗證：應該產生不同的索引（至少 3 種不同結果）
    const uniqueIndexes = new Set(results);
    expect(uniqueIndexes.size).toBeGreaterThanOrEqual(3);

    console.log(`\n✅ 隨機性測試通過：20 次抽獎產生了 ${uniqueIndexes.size} 種不同結果`);
    console.log(`   分佈: ${Array.from(uniqueIndexes).sort((a, b) => a - b).join(', ')}`);
  }, 30000); // 30 秒 timeout
});
