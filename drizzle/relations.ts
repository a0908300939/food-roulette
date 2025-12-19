import { relations } from "drizzle-orm";
import {
  users,
  merchants,
  merchantRestaurants,
  restaurants,
  restaurantStatistics,
  restaurantReviews,
  coupons,
  spinHistory,
  couponRedemptions,
} from "./schema";

/**
 * Users relations
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [users.id],
    references: [merchants.userId],
  }),
  spinHistory: many(spinHistory),
  couponRedemptions: many(couponRedemptions),
  restaurantReviews: many(restaurantReviews),
}));

/**
 * Merchants relations
 */
export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  user: one(users, {
    fields: [merchants.userId],
    references: [users.id],
  }),
  merchantRestaurants: many(merchantRestaurants),
}));

/**
 * Merchant Restaurants relations
 */
export const merchantRestaurantsRelations = relations(merchantRestaurants, ({ one }) => ({
  merchant: one(merchants, {
    fields: [merchantRestaurants.merchantId],
    references: [merchants.id],
  }),
  restaurant: one(restaurants, {
    fields: [merchantRestaurants.restaurantId],
    references: [restaurants.id],
  }),
}));

/**
 * Restaurants relations
 */
export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  merchantRestaurants: many(merchantRestaurants),
  coupons: many(coupons),
  spinHistory: many(spinHistory),
  couponRedemptions: many(couponRedemptions),
  restaurantStatistics: many(restaurantStatistics),
  restaurantReviews: many(restaurantReviews),
}));

/**
 * Restaurant Statistics relations
 */
export const restaurantStatisticsRelations = relations(restaurantStatistics, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantStatistics.restaurantId],
    references: [restaurants.id],
  }),
}));

/**
 * Restaurant Reviews relations
 */
export const restaurantReviewsRelations = relations(restaurantReviews, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantReviews.restaurantId],
    references: [restaurants.id],
  }),
  user: one(users, {
    fields: [restaurantReviews.userId],
    references: [users.id],
  }),
}));

/**
 * Coupons relations
 */
export const couponsRelations = relations(coupons, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [coupons.restaurantId],
    references: [restaurants.id],
  }),
  spinHistory: many(spinHistory),
  couponRedemptions: many(couponRedemptions),
}));

/**
 * Spin History relations
 */
export const spinHistoryRelations = relations(spinHistory, ({ one }) => ({
  user: one(users, {
    fields: [spinHistory.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [spinHistory.restaurantId],
    references: [restaurants.id],
  }),
  coupon: one(coupons, {
    fields: [spinHistory.couponId],
    references: [coupons.id],
  }),
}));

/**
 * Coupon Redemptions relations
 */
export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  user: one(users, {
    fields: [couponRedemptions.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [couponRedemptions.restaurantId],
    references: [restaurants.id],
  }),
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
}));
