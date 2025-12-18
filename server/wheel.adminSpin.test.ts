import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock db functions
vi.mock("./db", () => ({
  getTodaySpinCountByPeriod: vi.fn(),
  getTodayTotalSpinCount: vi.fn(),
  createSpinHistory: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin", // 管理員
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

function createUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user", // 一般使用者
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

describe("spin.recordSpin - 管理員抽獎次數限制", () => {
  it("管理員應該可以無限次抽獎（不受每日 10 次限制）", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Mock 返回值
    vi.mocked(db.createSpinHistory).mockResolvedValue({
      id: 1,
      userId: 1,
      restaurantId: 1,
      couponId: 1,
      mealPeriod: "lunch",
      createdAt: new Date(),
    });

    // 即使已經抽了 10 次，管理員仍然可以繼續抽
    const result = await caller.spin.recordSpin({
      restaurantId: 1,
      couponId: 1,
      mealPeriod: "lunch",
    });

    expect(result).toBeDefined();
    expect(result.userId).toBe(1);
    expect(result.restaurantId).toBe(1);
    
    // 驗證沒有調用次數檢查函式（因為管理員不需要檢查）
    expect(db.getTodaySpinCountByPeriod).not.toHaveBeenCalled();
    expect(db.getTodayTotalSpinCount).not.toHaveBeenCalled();
  });

  it("一般使用者應該受到每日 10 次限制", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Mock 返回值：本時段抽了 1 次，今日總共抽了 10 次
    vi.mocked(db.getTodaySpinCountByPeriod).mockResolvedValue(1);
    vi.mocked(db.getTodayTotalSpinCount).mockResolvedValue(10);

    // 一般使用者抽第 11 次應該失敗
    await expect(
      caller.spin.recordSpin({
        restaurantId: 1,
        couponId: 1,
        mealPeriod: "lunch",
      })
    ).rejects.toThrow("今日抽獎次數已達上限（10 次），明天再來吧！");

    // 驗證有調用次數檢查函式
    expect(db.getTodaySpinCountByPeriod).toHaveBeenCalledWith(2, "lunch");
    expect(db.getTodayTotalSpinCount).toHaveBeenCalledWith(2);
  });

  it("一般使用者應該受到每時段 2 次限制", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Mock 返回值：本時段已經抽了 2 次
    vi.mocked(db.getTodaySpinCountByPeriod).mockResolvedValue(2);
    vi.mocked(db.getTodayTotalSpinCount).mockResolvedValue(5);

    // 一般使用者本時段抽第 3 次應該失敗
    await expect(
      caller.spin.recordSpin({
        restaurantId: 1,
        couponId: 1,
        mealPeriod: "lunch",
      })
    ).rejects.toThrow("本時段抽獎次數已用完，請於下個時段再來！");

    // 驗證有調用次數檢查函式
    expect(db.getTodaySpinCountByPeriod).toHaveBeenCalledWith(2, "lunch");
  });

  it("一般使用者在限制內應該可以正常抽獎", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Mock 返回值：本時段抽了 1 次，今日總共抽了 5 次
    vi.mocked(db.getTodaySpinCountByPeriod).mockResolvedValue(1);
    vi.mocked(db.getTodayTotalSpinCount).mockResolvedValue(5);
    vi.mocked(db.createSpinHistory).mockResolvedValue({
      id: 2,
      userId: 2,
      restaurantId: 1,
      couponId: 1,
      mealPeriod: "lunch",
      createdAt: new Date(),
    });

    // 一般使用者在限制內應該可以正常抽獎
    const result = await caller.spin.recordSpin({
      restaurantId: 1,
      couponId: 1,
      mealPeriod: "lunch",
    });

    expect(result).toBeDefined();
    expect(result.userId).toBe(2);
    expect(result.restaurantId).toBe(1);

    // 驗證有調用次數檢查函式
    expect(db.getTodaySpinCountByPeriod).toHaveBeenCalledWith(2, "lunch");
    expect(db.getTodayTotalSpinCount).toHaveBeenCalledWith(2);
  });
});
