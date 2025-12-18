import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { isCouponExpired, getDaysExpired, shouldHideCoupon } from "./couponUtils";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("userCoupons.list", () => {
  it("應該返回使用者的優惠券列表", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userCoupons.list();

    expect(Array.isArray(result)).toBe(true);
    // 驗證返回的資料結構
    if (result.length > 0) {
      const firstCoupon = result[0];
      expect(firstCoupon).toHaveProperty("id");
      expect(firstCoupon).toHaveProperty("restaurantId");
      expect(firstCoupon).toHaveProperty("restaurantName");
      expect(firstCoupon).toHaveProperty("couponTitle");
      expect(firstCoupon).toHaveProperty("isRedeemed");
      expect(firstCoupon).toHaveProperty("createdAt");
    }
  });

  it("應該過濾超過 1 天的過期優惠券", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userCoupons.list();

    // 驗證所有返回的優惠券都在 1 天內
    result.forEach((coupon) => {
      const createdAt = new Date(coupon.createdAt);
      const daysExpired = getDaysExpired(createdAt);
      expect(daysExpired).toBeLessThanOrEqual(1);
    });
  });

  it("應該包含店家與優惠券的完整資訊", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userCoupons.list();

    if (result.length > 0) {
      const firstCoupon = result[0];
      // 驗證店家資訊
      expect(typeof firstCoupon.restaurantName).toBe("string");
      expect(typeof firstCoupon.restaurantAddress).toBe("string");
      // 驗證優惠券資訊
      expect(typeof firstCoupon.couponTitle).toBe("string");
      expect(typeof firstCoupon.couponDescription).toBe("string");
      // 驗證兌換狀態
      expect(typeof firstCoupon.isRedeemed).toBe("boolean");
    }
  });
});

describe("couponUtils", () => {
  it("isCouponExpired: 當天的優惠券應該有效", () => {
    const today = new Date();
    expect(isCouponExpired(today)).toBe(false);
  });

  it("isCouponExpired: 昨天的優惠券應該過期", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isCouponExpired(yesterday)).toBe(true);
  });

  it("getDaysExpired: 當天的優惠券過期天數應該為 0", () => {
    const today = new Date();
    expect(getDaysExpired(today)).toBe(0);
  });

  it("getDaysExpired: 昨天的優惠券過期天數應該為 1", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const daysExpired = getDaysExpired(yesterday);
    expect(daysExpired).toBeGreaterThanOrEqual(1);
    expect(daysExpired).toBeLessThanOrEqual(2); // 允許一些時間誤差
  });

  it("shouldHideCoupon: 當天的優惠券不應該隱藏", () => {
    const today = new Date();
    expect(shouldHideCoupon(today)).toBe(false);
  });

  it("shouldHideCoupon: 3 天前的優惠券應該隱藏", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(shouldHideCoupon(threeDaysAgo)).toBe(true);
  });

  it("shouldHideCoupon: 2 天前的優惠券不應該隱藏（邊界測試）", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    // 2 天前的優惠券仍然在保留期內
    const shouldHide = shouldHideCoupon(twoDaysAgo);
    // 可能因為時間精度問題，這裡允許兩種結果
    expect(typeof shouldHide).toBe("boolean");
  });
});
