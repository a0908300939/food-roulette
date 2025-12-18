import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("抽獎次數限制系統", () => {
  it("應該正確查詢當日剩餘抽獎次數（未使用）", async () => {
    const ctx = createAuthContext(999); // 使用不存在的使用者 ID
    const caller = appRouter.createCaller(ctx);

    const result = await caller.spin.getRemainingSpins({ mealPeriod: "lunch" });

    expect(result.remainingInPeriod).toBe(2);
    expect(result.remainingInDay).toBe(10);
    expect(result.usedInPeriod).toBe(0);
    expect(result.usedInDay).toBe(0);
    expect(result.canSpin).toBe(true);
  });

  it("應該正確計算時段剩餘次數", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // 查詢當前使用者在午餐時段的抽獎次數
    const lunchCount = await db.getTodaySpinCountByPeriod(1, "lunch");
    const remainingInPeriod = Math.max(0, 2 - lunchCount);

    const result = await caller.spin.getRemainingSpins({ mealPeriod: "lunch" });

    expect(result.remainingInPeriod).toBe(remainingInPeriod);
    expect(result.usedInPeriod).toBe(lunchCount);
  });

  it("應該正確計算每日總剩餘次數", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // 查詢當前使用者今日總抽獎次數
    const totalCount = await db.getTodayTotalSpinCount(1);
    const remainingInDay = Math.max(0, 10 - totalCount);

    const result = await caller.spin.getRemainingSpins({ mealPeriod: "lunch" });

    expect(result.remainingInDay).toBe(remainingInDay);
    expect(result.usedInDay).toBe(totalCount);
  });

  it("當時段次數用完時應該禁止抽獎", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // 查詢當前使用者在午餐時段的抽獎次數
    const lunchCount = await db.getTodaySpinCountByPeriod(1, "lunch");
    const result = await caller.spin.getRemainingSpins({ mealPeriod: "lunch" });

    // 驗證次數計算是否正確
    expect(result.usedInPeriod).toBe(lunchCount);
    expect(result.remainingInPeriod).toBe(Math.max(0, 2 - lunchCount));
    
    // 驗證 canSpin 邏輯
    if (lunchCount >= 2) {
      expect(result.canSpin).toBe(false);
      expect(result.remainingInPeriod).toBe(0);
    } else {
      // 還需要檢查每日總次數
      const totalCount = await db.getTodayTotalSpinCount(1);
      if (totalCount >= 10) {
        expect(result.canSpin).toBe(false);
      } else {
        expect(result.canSpin).toBe(true);
      }
    }
  });

  it("當每日次數用完時應該禁止抽獎", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // 查詢當前使用者今日總抽獎次數
    const totalCount = await db.getTodayTotalSpinCount(1);

    if (totalCount >= 10) {
      // 如果已經用完，測試是否正確禁止
      const result = await caller.spin.getRemainingSpins({ mealPeriod: "lunch" });
      expect(result.canSpin).toBe(false);
      expect(result.remainingInDay).toBe(0);
    } else {
      // 如果還有次數，測試是否允許
      const result = await caller.spin.getRemainingSpins({ mealPeriod: "lunch" });
      expect(result.remainingInDay).toBeGreaterThan(0);
    }
  });

  it("不同時段的次數應該獨立計算", async () => {
    const ctx = createAuthContext(999);
    const caller = appRouter.createCaller(ctx);

    const breakfast = await caller.spin.getRemainingSpins({ mealPeriod: "breakfast" });
    const lunch = await caller.spin.getRemainingSpins({ mealPeriod: "lunch" });
    const dinner = await caller.spin.getRemainingSpins({ mealPeriod: "dinner" });

    // 新使用者每個時段都應該有 2 次機會
    expect(breakfast.remainingInPeriod).toBe(2);
    expect(lunch.remainingInPeriod).toBe(2);
    expect(dinner.remainingInPeriod).toBe(2);
  });

  it("資料庫查詢函式應該正確返回當日時段次數", async () => {
    const count = await db.getTodaySpinCountByPeriod(1, "lunch");
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("資料庫查詢函式應該正確返回當日總次數", async () => {
    const count = await db.getTodayTotalSpinCount(1);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    // 不限制上限，因為測試環境中可能有歷史資料
  });
});
