import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(): { ctx: TrpcContext; cookies: Map<string, any> } {
  const cookies = new Map<string, any>();

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: any) => {
        cookies.set(name, { value, options });
      },
      clearCookie: (name: string, options: any) => {
        cookies.delete(name);
      },
    } as TrpcContext["res"],
  };

  return { ctx, cookies };
}

describe("auth.simpleLogin", () => {
  it("should create new user with phone number", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.simpleLogin({
      phone: "0912345678",
      deviceId: "test-device-id-123",
      deviceInfo: {
        userAgent: "Mozilla/5.0",
        screenResolution: "1920x1080",
        timezone: "Asia/Taipei",
      },
    });

    expect(result.success).toBe(true);
    expect(result.isNewUser).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.phone).toBe("0912345678");
    expect(cookies.has(COOKIE_NAME)).toBe(true);
  });

  it("should create new user with email", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.simpleLogin({
      email: "test@example.com",
      deviceId: "test-device-id-456",
      deviceInfo: {
        userAgent: "Mozilla/5.0",
        screenResolution: "1920x1080",
        timezone: "Asia/Taipei",
      },
    });

    expect(result.success).toBe(true);
    expect(result.isNewUser).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe("test@example.com");
    expect(cookies.has(COOKIE_NAME)).toBe(true);
  });

  it("should reject invalid phone number format", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.simpleLogin({
        phone: "1234567890", // 不是 09 開頭
        deviceId: "test-device-id",
        deviceInfo: {
          userAgent: "Mozilla/5.0",
          screenResolution: "1920x1080",
          timezone: "Asia/Taipei",
        },
      })
    ).rejects.toThrow("手機號碼格式錯誤");
  });

  it("should reject invalid email format", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.simpleLogin({
        email: "invalid-email", // 無效的 email 格式
        deviceId: "test-device-id",
        deviceInfo: {
          userAgent: "Mozilla/5.0",
          screenResolution: "1920x1080",
          timezone: "Asia/Taipei",
        },
      })
    ).rejects.toThrow("Email 格式錯誤");
  });

  it("should reject when neither phone nor email is provided", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.simpleLogin({
        deviceId: "test-device-id",
        deviceInfo: {
          userAgent: "Mozilla/5.0",
          screenResolution: "1920x1080",
          timezone: "Asia/Taipei",
        },
      })
    ).rejects.toThrow("請提供手機號碼或 Email");
  });

  it("should login existing user and update device", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // 第一次登入（建立帳號）
    const firstLogin = await caller.auth.simpleLogin({
      phone: "0987654321",
      deviceId: "device-1",
      deviceInfo: {
        userAgent: "Mozilla/5.0",
        screenResolution: "1920x1080",
        timezone: "Asia/Taipei",
      },
    });

    expect(firstLogin.isNewUser).toBe(true);

    // 第二次登入（相同手機號碼，不同裝置）
    const secondLogin = await caller.auth.simpleLogin({
      phone: "0987654321",
      deviceId: "device-2", // 不同裝置
      deviceInfo: {
        userAgent: "Mozilla/5.0",
        screenResolution: "1920x1080",
        timezone: "Asia/Taipei",
      },
    });

    expect(secondLogin.success).toBe(true);
    expect(secondLogin.isNewUser).toBe(false);
    expect(secondLogin.user?.phone).toBe("0987654321");
    expect(cookies.has(COOKIE_NAME)).toBe(true);
  });
});
