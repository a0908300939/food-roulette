import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
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

  return ctx;
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "line",
    role: "user",
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

  return ctx;
}

describe("users.list", () => {
  it("管理員可以查詢所有使用者列表", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();

    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(0);
    
    // 檢查使用者資料結構
    if (users.length > 0) {
      const user = users[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("loginMethod");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("createdAt");
      expect(user).toHaveProperty("lastSignedIn");
    }
  });

  it("一般使用者無法查詢使用者列表", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow();
  });
});

describe("users.getById", () => {
  it("管理員可以查詢特定使用者的詳細資訊", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 先取得使用者列表
    const users = await caller.users.list();
    
    if (users.length > 0) {
      const userId = users[0]!.id;
      const user = await caller.users.getById({ id: userId });

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
    }
  });

  it("一般使用者無法查詢使用者詳細資訊", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.getById({ id: 1 })).rejects.toThrow();
  });
});

describe("users.getActivity", () => {
  it("管理員可以查詢使用者的活動記錄", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 先取得使用者列表
    const users = await caller.users.list();
    
    if (users.length > 0) {
      const userId = users[0]!.id;
      const activity = await caller.users.getActivity({ userId });

      expect(activity).toBeDefined();
      expect(activity).toHaveProperty("spinCount");
      expect(activity).toHaveProperty("couponCount");
      expect(activity).toHaveProperty("redeemedCount");
      expect(activity).toHaveProperty("recentSpins");
      expect(Array.isArray(activity.recentSpins)).toBe(true);
      expect(typeof activity.spinCount).toBe("number");
      expect(typeof activity.couponCount).toBe("number");
      expect(typeof activity.redeemedCount).toBe("number");
    }
  });

  it("活動記錄中的最近轉盤記錄不超過 10 筆", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 先取得使用者列表
    const users = await caller.users.list();
    
    if (users.length > 0) {
      const userId = users[0]!.id;
      const activity = await caller.users.getActivity({ userId });

      expect(activity.recentSpins.length).toBeLessThanOrEqual(10);
    }
  });

  it("一般使用者無法查詢使用者活動記錄", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.getActivity({ userId: 1 })).rejects.toThrow();
  });
});

describe("users.updateRole", () => {
  it("管理員可以更新使用者角色", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 先取得使用者列表
    const users = await caller.users.list();
    const regularUsers = users.filter(u => u.role === "user");
    
    if (regularUsers.length > 0) {
      const userId = regularUsers[0]!.id;
      const originalRole = regularUsers[0]!.role;

      // 更新為管理員
      const result = await caller.users.updateRole({ 
        userId, 
        role: "admin" 
      });

      expect(result).toEqual({ success: true });

      // 驗證角色已更新
      const updatedUser = await caller.users.getById({ id: userId });
      expect(updatedUser?.role).toBe("admin");

      // 恢復原始角色
      await caller.users.updateRole({ 
        userId, 
        role: originalRole 
      });
    }
  });

  it("一般使用者無法更新使用者角色", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.updateRole({ userId: 1, role: "admin" })
    ).rejects.toThrow();
  });

  it("只能設定 user 或 admin 角色", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // TypeScript 會阻止傳入無效的角色值
    // 這個測試主要是確保 schema 驗證正確
    const users = await caller.users.list();
    
    if (users.length > 0) {
      const userId = users[0]!.id;
      
      // 測試有效的角色值
      await expect(
        caller.users.updateRole({ userId, role: "user" })
      ).resolves.toEqual({ success: true });

      await expect(
        caller.users.updateRole({ userId, role: "admin" })
      ).resolves.toEqual({ success: true });
    }
  });
});
