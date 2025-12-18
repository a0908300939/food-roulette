import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

function createUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "normal-user",
    email: "user@example.com",
    name: "Normal User",
    loginMethod: "manus",
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("notification.create", () => {
  it("should allow admin to create notification", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.create({
      title: "測試推播",
      content: "這是一則測試推播訊息",
    });

    expect(result.success).toBe(true);
    expect(result.notificationId).toBeGreaterThan(0);
  });

  it("should reject non-admin user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.notification.create({
        title: "測試推播",
        content: "這是一則測試推播訊息",
      })
    ).rejects.toThrow("只有管理員可以建立推播訊息");
  });
});

describe("notification.list", () => {
  it("should allow admin to list all notifications", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should reject non-admin user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.notification.list()).rejects.toThrow(
      "只有管理員可以查看推播列表"
    );
  });
});

describe("notification.listForUser", () => {
  it("should return sent notifications for authenticated user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.listForUser();

    expect(Array.isArray(result)).toBe(true);
    // 所有返回的推播都應該是已發送狀態
    result.forEach((notification) => {
      expect(notification.status).toBe("sent");
    });
  });
});

describe("notification.send", () => {
  it("should allow admin to send notification", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // 先建立一個推播
    const createResult = await caller.notification.create({
      title: "測試推播",
      content: "這是一則測試推播訊息",
    });

    // 發送推播
    const sendResult = await caller.notification.send({
      notificationId: createResult.notificationId,
    });

    expect(sendResult.success).toBe(true);
  });

  it("should reject non-admin user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.notification.send({ notificationId: 1 })
    ).rejects.toThrow("只有管理員可以發送推播訊息");
  });
});

describe("notification.markAsRead", () => {
  it("should allow user to mark notification as read", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // 假設存在一個已發送的推播 ID
    const result = await caller.notification.markAsRead({
      notificationId: 1,
    });

    expect(result.success).toBe(true);
  });

  it("should return alreadyRead if notification was already read", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // 第一次標記為已讀
    await caller.notification.markAsRead({ notificationId: 1 });

    // 第二次標記為已讀
    const result = await caller.notification.markAsRead({
      notificationId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.alreadyRead).toBe(true);
  });
});
