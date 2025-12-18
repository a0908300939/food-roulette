import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
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

describe("轉盤顯示與抽獎結果一致性測試", () => {
  it("應該確保後端返回的 selectedIndex 對應到前端傳入的 wheelSlices", async () => {
    const { ctx } = createAuthContext("admin"); // 使用管理員避免次數限制
    const caller = appRouter.createCaller(ctx);

    // 模擬前端傳入的轉盤資料（6 個店家，每個店家預先分配一張優惠券）
    const mockWheelSlices = [
      { restaurantId: 1, couponId: 1 },
      { restaurantId: 2, couponId: 2 },
      { restaurantId: 3, couponId: 3 },
      { restaurantId: 4, couponId: 4 },
      { restaurantId: 5, couponId: 5 },
      { restaurantId: 6, couponId: 6 },
    ];

    // 進行 10 次抽獎測試
    const testCount = 10;
    console.log(`\n開始進行 ${testCount} 次一致性測試...\n`);

    for (let i = 0; i < testCount; i++) {
      const result = await caller.spin.draw({
        wheelSlices: mockWheelSlices,
        mealPeriod: "lunch",
      });

      // 驗證：後端返回的 selectedIndex 必須在範圍內
      expect(result.selectedIndex).toBeGreaterThanOrEqual(0);
      expect(result.selectedIndex).toBeLessThan(mockWheelSlices.length);

      // 驗證：後端返回的店家 ID 必須與 wheelSlices[selectedIndex] 一致
      const expectedSlice = mockWheelSlices[result.selectedIndex];
      expect(result.restaurant.id).toBe(expectedSlice.restaurantId);

      // 驗證：後端返回的優惠券 ID 必須與 wheelSlices[selectedIndex] 一致
      if (result.coupon) {
        expect(result.coupon.id).toBe(expectedSlice.couponId);
        console.log(
          `  第 ${i + 1} 次：✅ 位置 ${result.selectedIndex} - ${result.restaurant.name} - ${result.coupon.title}`
        );
      } else {
        // 如果沒有優惠券，expectedSlice.couponId 也應該是 null
        expect(expectedSlice.couponId).toBeNull();
        console.log(
          `  第 ${i + 1} 次：✅ 位置 ${result.selectedIndex} - ${result.restaurant.name} - 無優惠券`
        );
      }
    }

    console.log(`\n✅ ${testCount} 次一致性測試全部通過！\n`);
  });

  it("應該確保轉盤資料順序不會影響抽獎結果的一致性", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // 模擬兩種不同順序的轉盤資料
    const wheelSlicesA = [
      { restaurantId: 1, couponId: 1 },
      { restaurantId: 2, couponId: 2 },
      { restaurantId: 3, couponId: 3 },
    ];

    const wheelSlicesB = [
      { restaurantId: 3, couponId: 3 },
      { restaurantId: 1, couponId: 1 },
      { restaurantId: 2, couponId: 2 },
    ];

    // 測試順序 A
    const resultA = await caller.spin.draw({
      wheelSlices: wheelSlicesA,
      mealPeriod: "lunch",
    });

    const expectedSliceA = wheelSlicesA[resultA.selectedIndex];
    expect(resultA.restaurant.id).toBe(expectedSliceA.restaurantId);
    if (resultA.coupon) {
      expect(resultA.coupon.id).toBe(expectedSliceA.couponId);
    }

    console.log(
      `順序 A：位置 ${resultA.selectedIndex} - ${resultA.restaurant.name} - ${resultA.coupon?.title || "無優惠券"}`
    );

    // 測試順序 B
    const resultB = await caller.spin.draw({
      wheelSlices: wheelSlicesB,
      mealPeriod: "lunch",
    });

    const expectedSliceB = wheelSlicesB[resultB.selectedIndex];
    expect(resultB.restaurant.id).toBe(expectedSliceB.restaurantId);
    if (resultB.coupon) {
      expect(resultB.coupon.id).toBe(expectedSliceB.couponId);
    }

    console.log(
      `順序 B：位置 ${resultB.selectedIndex} - ${resultB.restaurant.name} - ${resultB.coupon?.title || "無優惠券"}`
    );

    console.log("\n✅ 不同順序的轉盤資料測試通過！\n");
  });
});
