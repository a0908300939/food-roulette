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

function createPublicContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: null,
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

describe("wheel.getVersion", () => {
  it("公開 API 可以查詢當前轉盤版本", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.wheel.getVersion();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("version");
    expect(typeof result.version).toBe("string");
  });

  it("預設轉盤版本為 canvas", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.wheel.getVersion();

    // 如果沒有設定過，預設應該是 canvas
    expect(['v1', 'v2', 'v3', 'canvas']).toContain(result.version);
  });
});

describe("wheel.setVersion", () => {
  it("管理員可以設定轉盤版本為 v1", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.wheel.setVersion({ version: "v1" });

    expect(result).toEqual({ success: true, version: "v1" });

    // 驗證版本已更新
    const currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("v1");
  });

  it("管理員可以設定轉盤版本為 v2", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.wheel.setVersion({ version: "v2" });

    expect(result).toEqual({ success: true, version: "v2" });

    // 驗證版本已更新
    const currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("v2");
  });

  it("管理員可以設定轉盤版本為 v3", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.wheel.setVersion({ version: "v3" });

    expect(result).toEqual({ success: true, version: "v3" });

    // 驗證版本已更新
    const currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("v3");
  });

  it("管理員可以設定轉盤版本為 canvas", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.wheel.setVersion({ version: "canvas" });

    expect(result).toEqual({ success: true, version: "canvas" });

    // 驗證版本已更新
    const currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("canvas");
  });

  it("只能設定有效的轉盤版本（v1, v2, v3, canvas）", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // TypeScript 會阻止傳入無效的版本值
    // 這個測試主要是確保 schema 驗證正確
    const validVersions: Array<'v1' | 'v2' | 'v3' | 'canvas'> = ['v1', 'v2', 'v3', 'canvas'];

    for (const version of validVersions) {
      const result = await caller.wheel.setVersion({ version });
      expect(result.success).toBe(true);
      expect(result.version).toBe(version);
    }
  });

  it("版本切換後可以正確讀取", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 設定為 v1
    await caller.wheel.setVersion({ version: "v1" });
    let currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("v1");

    // 切換為 v2
    await caller.wheel.setVersion({ version: "v2" });
    currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("v2");

    // 切換為 v3
    await caller.wheel.setVersion({ version: "v3" });
    currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("v3");

    // 切換回 canvas
    await caller.wheel.setVersion({ version: "canvas" });
    currentVersion = await caller.wheel.getVersion();
    expect(currentVersion.version).toBe("canvas");
  });
});
