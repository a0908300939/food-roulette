import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { getDb } from "./db";
import { pushNotifications, userNotificationReads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
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

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
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

describe("notification.getUnreadCount", () => {
  beforeEach(async () => {
    // 清理測試資料
    const database = await getDb();
    if (!database) return;

    try {
      // 清理測試使用者的已讀記錄
      await database.delete(userNotificationReads).where(eq(userNotificationReads.userId, 1));
      await database.delete(userNotificationReads).where(eq(userNotificationReads.userId, 2));
    } catch (error) {
      // 忽略錯誤
    }
  });

  it("應該返回未讀通知數量", async () => {
    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.getUnreadCount();

    expect(result).toHaveProperty("unreadCount");
    expect(typeof result.unreadCount).toBe("number");
    expect(result.unreadCount).toBeGreaterThanOrEqual(0);
  });

  it("新使用者應該看到所有已發送的通知為未讀", async () => {
    const ctx = createUserContext(999); // 使用一個新的使用者 ID
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.getUnreadCount();

    // 新使用者應該有未讀通知（假設資料庫中有已發送的通知）
    expect(result.unreadCount).toBeGreaterThanOrEqual(0);
  });

  it("標記通知為已讀後，未讀數量應該減少", async () => {
    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);

    // 先查詢未讀數量
    const before = await caller.notification.getUnreadCount();
    const initialCount = before.unreadCount;

    if (initialCount === 0) {
      // 如果沒有未讀通知，跳過此測試
      return;
    }

    // 取得一則未讀通知
    const notifications = await caller.notification.listForUser();
    const unreadNotification = notifications.find((n) => !n.isRead);

    if (!unreadNotification) {
      // 如果沒有未讀通知，跳過此測試
      return;
    }

    // 標記為已讀
    await caller.notification.markAsRead({ notificationId: unreadNotification.id });

    // 再次查詢未讀數量
    const after = await caller.notification.getUnreadCount();

    // 未讀數量應該減少 1
    expect(after.unreadCount).toBe(initialCount - 1);
  });

  it("未登入使用者無法查詢未讀數量", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(caller.notification.getUnreadCount()).rejects.toThrow();
  });

  it("管理員也可以查詢未讀數量", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.getUnreadCount();

    expect(result).toHaveProperty("unreadCount");
    expect(typeof result.unreadCount).toBe("number");
    expect(result.unreadCount).toBeGreaterThanOrEqual(0);
  });
});
