import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// 管理員權限檢查
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理員權限' });
  }
  return next({ ctx });
});

/**
 * 推播訊息路由
 */
export const pushNotificationRouter = router({
  /**
   * 取得所有推播訊息（管理員）
   */
  list: adminProcedure.query(async () => {
    return db.getAllPushNotifications();
  }),

  /**
   * 取得單一推播訊息
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getPushNotificationById(input.id);
    }),

  /**
   * 建立推播訊息
   */
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      imageUrl: z.string().optional(),
      couponId: z.number().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const status = input.scheduledAt ? 'scheduled' : 'draft';
      
      return db.createPushNotification({
        title: input.title,
        content: input.content,
        imageUrl: input.imageUrl,
        couponId: input.couponId,
        status,
        scheduledAt: input.scheduledAt,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * 更新推播訊息
   */
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      imageUrl: z.string().optional(),
      couponId: z.number().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updatePushNotification(id, data);
    }),

  /**
   * 刪除推播訊息
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deletePushNotification(input.id);
    }),

  /**
   * 立即發送推播訊息
   */
  send: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const notification = await db.getPushNotificationById(input.id);
      
      if (!notification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '推播訊息不存在' });
      }
      
      if (notification.status === 'sent') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '此推播訊息已經發送過了' });
      }
      
      // 更新狀態為已發送
      await db.updatePushNotification(input.id, {
        status: 'sent',
        sentAt: new Date(),
      });
      
      return { success: true };
    }),

  /**
   * 取得使用者未讀推播（使用者端）
   */
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    return db.getUnreadNotifications(ctx.user.id);
  }),

  /**
   * 標記推播為已讀（使用者端）
   */
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markNotificationAsRead(ctx.user.id, input.notificationId);
      return { success: true };
    }),

  /**
   * 取得所有已發送的推播（使用者端）
   */
  getSent: publicProcedure.query(async () => {
    return db.getSentPushNotifications();
  }),
});
