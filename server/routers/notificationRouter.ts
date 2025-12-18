import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pushNotifications, userNotificationReads, coupons, restaurants } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";

/**
 * 推播管理路由
 * 提供推播訊息的建立、查詢、發送、AI 文案生成功能
 */
export const notificationRouter = router({
  /**
   * 建立推播訊息
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        couponId: z.number().optional(),
        imageUrl: z.string().optional(),
        scheduledAt: z.string().optional(), // ISO 8601 格式
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 檢查是否為管理員
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只有管理員可以建立推播訊息",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "資料庫連線失敗",
        });
      }

      // 如果有優惠券 ID，取得優惠券圖片
      let finalImageUrl = input.imageUrl;
      if (input.couponId && !finalImageUrl) {
        const couponResult = await db
          .select()
          .from(coupons)
          .where(eq(coupons.id, input.couponId))
          .limit(1);

        if (couponResult.length > 0 && couponResult[0]?.imageUrl) {
          finalImageUrl = couponResult[0].imageUrl;
        }
      }

      // 建立推播訊息
      await db.insert(pushNotifications).values({
        title: input.title,
        content: input.content,
        couponId: input.couponId,
        imageUrl: finalImageUrl,
        status: input.scheduledAt ? "scheduled" : "draft",
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        createdBy: ctx.user.id,
      });

      // 查詢剛插入的記錄來獲取 ID
      const inserted = await db
        .select()
        .from(pushNotifications)
        .where(eq(pushNotifications.createdBy, ctx.user.id))
        .orderBy(desc(pushNotifications.id))
        .limit(1);

      const insertId = inserted[0]?.id || 0;

      return {
        success: true,
        notificationId: insertId,
      };
    }),

  /**
   * 查詢所有推播訊息（管理員）
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // 檢查是否為管理員
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "只有管理員可以查看推播列表",
      });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "資料庫連線失敗",
      });
    }

    const notifications = await db
      .select()
      .from(pushNotifications)
      .orderBy(desc(pushNotifications.createdAt));

    return notifications;
  }),

  /**
   * 查詢使用者的推播訊息（已發送）
   */
  listForUser: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "資料庫連線失敗",
      });
    }

    // 查詢所有已發送的推播
    const notifications = await db
      .select()
      .from(pushNotifications)
      .where(eq(pushNotifications.status, "sent"))
      .orderBy(desc(pushNotifications.sentAt));

    // 查詢使用者已讀的推播 ID
    const readNotifications = await db
      .select()
      .from(userNotificationReads)
      .where(eq(userNotificationReads.userId, ctx.user.id));

    const readIds = new Set(readNotifications.map((r) => r.notificationId));

    // 標記已讀狀態
    const notificationsWithReadStatus = notifications.map((n) => ({
      ...n,
      isRead: readIds.has(n.id),
    }));

    return notificationsWithReadStatus;
  }),

  /**
   * 查詢未讀通知數量
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "資料庫連線失敗",
      });
    }

    // 查詢所有已發送的推播
    const sentNotifications = await db
      .select()
      .from(pushNotifications)
      .where(eq(pushNotifications.status, "sent"));

    // 查詢使用者已讀的推播 ID
    const readNotifications = await db
      .select()
      .from(userNotificationReads)
      .where(eq(userNotificationReads.userId, ctx.user.id));

    const readIds = new Set(readNotifications.map((r) => r.notificationId));

    // 計算未讀數量
    const unreadCount = sentNotifications.filter((n) => !readIds.has(n.id)).length;

    return { unreadCount };
  }),

  /**
   * 標記推播為已讀
   */
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "資料庫連線失敗",
        });
      }

      // 檢查是否已讀
      const existing = await db
        .select()
        .from(userNotificationReads)
        .where(
          and(
            eq(userNotificationReads.userId, ctx.user.id),
            eq(userNotificationReads.notificationId, input.notificationId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: true, alreadyRead: true };
      }

      // 新增已讀記錄
      await db.insert(userNotificationReads).values({
        userId: ctx.user.id,
        notificationId: input.notificationId,
      });

      return { success: true, alreadyRead: false };
    }),

  /**
   * 發送推播訊息
   */
  send: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 檢查是否為管理員
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只有管理員可以發送推播訊息",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "資料庫連線失敗",
        });
      }

      // 查詢推播訊息
      const notification = await db
        .select()
        .from(pushNotifications)
        .where(eq(pushNotifications.id, input.notificationId))
        .limit(1);

      if (notification.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "推播訊息不存在",
        });
      }

      // 更新推播狀態為已發送
      await db
        .update(pushNotifications)
        .set({
          status: "sent",
          sentAt: new Date(),
        })
        .where(eq(pushNotifications.id, input.notificationId));

      return { success: true };
    }),

  /**
   * 刪除推播訊息
   */
  delete: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 檢查是否為管理員
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只有管理員可以刪除推播訊息",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "資料庫連線失敗",
        });
      }

      // 刪除推播訊息
      await db
        .delete(pushNotifications)
        .where(eq(pushNotifications.id, input.notificationId));

      // 同時刪除相關的已讀記錄
      await db
        .delete(userNotificationReads)
        .where(eq(userNotificationReads.notificationId, input.notificationId));

      return { success: true };
    }),

  /**
   * AI 文案生成
   * 根據優惠券資訊生成推播文案
   */
  generateCopy: protectedProcedure
    .input(z.object({ couponId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 檢查是否為管理員
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只有管理員可以使用 AI 文案生成",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "資料庫連線失敗",
        });
      }

      // 查詢優惠券資訊
      const couponResult = await db
        .select({
          coupon: coupons,
          restaurant: restaurants,
        })
        .from(coupons)
        .leftJoin(restaurants, eq(coupons.restaurantId, restaurants.id))
        .where(eq(coupons.id, input.couponId))
        .limit(1);

      if (couponResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "優惠券不存在",
        });
      }

      const { coupon, restaurant } = couponResult[0]!;

      // 使用 LLM 生成文案
      const prompt = `你是一個專業的行銷文案撰寫者，請根據以下優惠券資訊，生成一則吸引人的推播通知文案。

優惠券資訊：
- 店家名稱：${restaurant?.name || "未知店家"}
- 優惠券標題：${coupon.title}
- 優惠券描述：${coupon.description}
- 優惠券類型：${coupon.type === "discount" ? "折扣" : coupon.type === "gift" ? "贈品" : coupon.type === "cashback" ? "現金回饋" : "簽到獎勵"}

要求：
1. 生成一個吸引人的標題（10-20 字）
2. 生成推播內容（30-80 字）
3. 文案要活潑、吸引人，並強調優惠的價值
4. 使用 JSON 格式回傳，包含 title 和 content 兩個欄位

範例格式：
{
  "title": "🎉 限時優惠！劉大爺豆花買一送一",
  "content": "今天來劉大爺，享受超值優惠！新鮮手作豆花，Q彈芋圓，現在買一送一，錯過可惜！快來轉轉盤抽優惠券吧～"
}`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "你是一個專業的行銷文案撰寫者，擅長撰寫吸引人的推播通知文案。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "notification_copy",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "推播標題（10-20 字）",
                  },
                  content: {
                    type: "string",
                    description: "推播內容（30-80 字）",
                  },
                },
                required: ["title", "content"],
                additionalProperties: false,
              },
            },
          },
        });

        const messageContent = response.choices[0]?.message?.content;
        const contentString = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
        const generatedCopy = JSON.parse(contentString || "{}");

        return {
          success: true,
          title: generatedCopy.title || "",
          content: generatedCopy.content || "",
        };
      } catch (error) {
        console.error("AI 文案生成失敗:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI 文案生成失敗",
        });
      }
    }),
});
