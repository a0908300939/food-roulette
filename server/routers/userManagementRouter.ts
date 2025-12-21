import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

// 管理員權限檢查
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

export const userManagementRouter = router({
  // 取得所有使用者列表
  listUsers: adminProcedure.query(async () => {
    return await db.getAllUsersWithRestaurants();
  }),

  // 更新使用者角色
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "merchant", "admin"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // 指派使用者到商家
  assignUserToRestaurants: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        restaurantIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.assignUserToRestaurants(
        input.userId,
        input.restaurantIds,
        ctx.user.id
      );
      return { success: true };
    }),

  // 取得使用者管理的商家列表
  getUserRestaurants: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await db.getUserRestaurants(input.userId);
    }),
});
