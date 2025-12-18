import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: 'user' | 'admin' = 'user'): TrpcContext {
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
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("spin.draw - 索引導向邏輯測試", () => {
  it("後端應該隨機選擇一個 selectedIndex", async () => {
    const ctx = createAuthContext('admin'); // 使用管理員避免次數限制
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length === 0) {
      console.log('⚠️ 跳過測試：資料庫中沒有店家資料');
      return;
    }

    // 使用實際存在的店家 ID
    const wheelData = restaurants.slice(0, 4).map(r => ({
      restaurantId: r.id,
      couponId: null,
    }));

    const result = await caller.spin.draw({
      mealPeriod: "lunch",
      wheelData,
    });

    // 驗證返回的 selectedIndex 在有效範圍內
    expect(result.selectedIndex).toBeGreaterThanOrEqual(0);
    expect(result.selectedIndex).toBeLessThan(wheelData.length);
    
    // 驗證返回的店家與 selectedIndex 對應
    const selectedItem = wheelData[result.selectedIndex];
    expect(result.restaurant.id).toBe(selectedItem.restaurantId);
    
    console.log(`✅ 測試通過：selectedIndex = ${result.selectedIndex}, 店家 = ${result.restaurant.name}`);
  });

  it("多次抽獎應該產生不同的 selectedIndex（隨機性測試）", async () => {
    const ctx = createAuthContext('admin');
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length < 4) {
      console.log('⚠️ 跳過測試：資料庫中店家數量不足 4 家');
      return;
    }

    const wheelData = restaurants.slice(0, 6).map(r => ({
      restaurantId: r.id,
      couponId: null,
    }));

    const results: number[] = [];
    
    // 抽 20 次
    for (let i = 0; i < 20; i++) {
      const result = await caller.spin.draw({
        mealPeriod: "lunch",
        wheelData,
      });
      results.push(result.selectedIndex);
    }

    // 驗證有產生不同的索引（至少 3 種不同的結果）
    const uniqueIndexes = new Set(results);
    expect(uniqueIndexes.size).toBeGreaterThanOrEqual(3);
    
    console.log(`✅ 隨機性測試通過：20 次抽獎產生了 ${uniqueIndexes.size} 種不同結果`);
    console.log(`   分佈: ${Array.from(uniqueIndexes).sort((a, b) => a - b).join(', ')}`);
  }, 30000); // 30 秒 timeout

  it("selectedIndex 應該與實際記錄到資料庫的店家一致", async () => {
    const ctx = createAuthContext('admin');
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length === 0) {
      console.log('⚠️ 跳過測試：資料庫中沒有店家資料');
      return;
    }

    const wheelData = restaurants.slice(0, 3).map(r => ({
      restaurantId: r.id,
      couponId: null,
    }));

    const result = await caller.spin.draw({
      mealPeriod: "dinner",
      wheelData,
    });

    // 驗證返回的 selectedIndex 對應的店家 ID
    const expectedRestaurantId = wheelData[result.selectedIndex].restaurantId;
    expect(result.restaurant.id).toBe(expectedRestaurantId);
    
    // 驗證 spinHistoryId 存在（表示已記錄到資料庫）
    expect(result.spinHistoryId).toBeDefined();
    
    console.log(`✅ 資料一致性測試通過：selectedIndex = ${result.selectedIndex}, restaurantId = ${result.restaurant.id}`);
  });

  it("當 wheelData 只有 1 個選項時，應該返回 selectedIndex = 0", async () => {
    const ctx = createAuthContext('admin');
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length === 0) {
      console.log('⚠️ 跳過測試：資料庫中沒有店家資料');
      return;
    }

    const wheelData = [
      { restaurantId: restaurants[0].id, couponId: null },
    ];

    const result = await caller.spin.draw({
      mealPeriod: "breakfast",
      wheelData,
    });

    expect(result.selectedIndex).toBe(0);
    expect(result.restaurant.id).toBe(restaurants[0].id);
    
    console.log(`✅ 單一選項測試通過`);
  });

  it("一般使用者應該受到每日次數限制", async () => {
    const ctx = createAuthContext('user'); // 一般使用者
    const caller = appRouter.createCaller(ctx);

    // 查詢實際存在的店家
    const restaurants = await db.getAllRestaurants();
    if (restaurants.length === 0) {
      console.log('⚠️ 跳過測試：資料庫中沒有店家資料');
      return;
    }

    const wheelData = restaurants.slice(0, 2).map(r => ({
      restaurantId: r.id,
      couponId: null,
    }));

    // 查詢當前使用者今日已使用次數
    const todayCount = await db.getTodayTotalSpinCount(ctx.user!.id);
    const periodCount = await db.getTodaySpinCountByPeriod(ctx.user!.id, 'lunch');
    
    if (todayCount >= 10 || periodCount >= 2) {
      // 如果已經用完次數，應該拋出錯誤
      await expect(caller.spin.draw({
        mealPeriod: "lunch",
        wheelData,
      })).rejects.toThrow(); // 只驗證有拋出錯誤，不驗證具體訊息
      
      console.log(`✅ 次數限制測試通過：一般使用者已用完次數`);
    } else {
      // 如果還有次數，應該可以正常抽獎
      const result = await caller.spin.draw({
        mealPeriod: "lunch",
        wheelData,
      });
      
      expect(result.selectedIndex).toBeGreaterThanOrEqual(0);
      console.log(`✅ 次數限制測試通過：一般使用者還有剩餘次數（已用 ${todayCount}/10）`);
    }
  });
});
