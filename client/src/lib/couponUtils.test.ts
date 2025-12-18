import { describe, it, expect, beforeEach, vi } from "vitest";
import { isCouponExpired, getDaysExpired, shouldHideCoupon } from "./couponUtils";

describe("couponUtils", () => {
  beforeEach(() => {
    // 重置時間模擬
    vi.clearAllMocks();
  });

  describe("isCouponExpired", () => {
    it("should return false for a coupon created today (regular coupon)", () => {
      // 假設今天是 2025-11-30 12:00:00
      const today = new Date("2025-11-30T12:00:00");
      
      // 一般優惠券在當天 23:59:59 之前應該未過期
      const result = isCouponExpired(today, false);
      expect(result).toBe(false);
    });

    it("should return true for a coupon created yesterday (regular coupon)", () => {
      // 昨天建立的優惠券應該已過期
      const yesterday = new Date("2025-11-29T12:00:00");
      
      const result = isCouponExpired(yesterday, false);
      expect(result).toBe(true);
    });

    it("should return false for a check-in reward created 3 days ago", () => {
      // 簽到獎勵在 7 天內應該未過期
      const threeDaysAgo = new Date("2025-11-27T12:00:00");
      
      const result = isCouponExpired(threeDaysAgo, true);
      expect(result).toBe(false);
    });

    it("should return false for a check-in reward created 7 days ago at 12:00", () => {
      // 簽到獎勵在第 7 天的 23:59:59 之前應該未過期
      const sevenDaysAgo = new Date("2025-11-23T12:00:00");
      
      const result = isCouponExpired(sevenDaysAgo, true);
      expect(result).toBe(false);
    });

    it("should return true for a check-in reward created 8 days ago", () => {
      // 簽到獎勵在第 8 天應該已過期
      const eightDaysAgo = new Date("2025-11-22T12:00:00");
      
      const result = isCouponExpired(eightDaysAgo, true);
      expect(result).toBe(true);
    });

    it("should return false for a check-in reward created today", () => {
      // 簽到獎勵在當天應該未過期
      const today = new Date("2025-11-30T12:00:00");
      
      const result = isCouponExpired(today, true);
      expect(result).toBe(false);
    });
  });

  describe("getDaysExpired", () => {
    it("should return 0 for a coupon created today (regular coupon)", () => {
      const today = new Date("2025-11-30T12:00:00");
      
      const result = getDaysExpired(today, false);
      expect(result).toBe(0);
    });

    it("should return 1 for a coupon created yesterday (regular coupon)", () => {
      const yesterday = new Date("2025-11-29T12:00:00");
      
      const result = getDaysExpired(yesterday, false);
      expect(result).toBe(1);
    });

    it("should return 0 for a check-in reward created 3 days ago", () => {
      const threeDaysAgo = new Date("2025-11-27T12:00:00");
      
      const result = getDaysExpired(threeDaysAgo, true);
      expect(result).toBe(0);
    });

    it("should return 0 for a check-in reward created 7 days ago", () => {
      const sevenDaysAgo = new Date("2025-11-23T12:00:00");
      
      const result = getDaysExpired(sevenDaysAgo, true);
      expect(result).toBe(0);
    });

    it("should return 1 for a check-in reward created 8 days ago", () => {
      const eightDaysAgo = new Date("2025-11-22T12:00:00");
      
      const result = getDaysExpired(eightDaysAgo, true);
      expect(result).toBe(1);
    });
  });

  describe("shouldHideCoupon", () => {
    it("should return false for a coupon created today (not expired)", () => {
      const today = new Date("2025-11-30T12:00:00");
      
      const result = shouldHideCoupon(today, 2, false);
      expect(result).toBe(false);
    });

    it("should return false for a coupon expired 1 day ago (within maxDays)", () => {
      const yesterday = new Date("2025-11-29T12:00:00");
      
      const result = shouldHideCoupon(yesterday, 2, false);
      expect(result).toBe(false);
    });

    it("should return true for a coupon expired 3 days ago (beyond maxDays)", () => {
      const threeDaysAgo = new Date("2025-11-27T12:00:00");
      
      const result = shouldHideCoupon(threeDaysAgo, 2, false);
      expect(result).toBe(true);
    });

    it("should return false for a check-in reward created 7 days ago", () => {
      const sevenDaysAgo = new Date("2025-11-23T12:00:00");
      
      const result = shouldHideCoupon(sevenDaysAgo, 2, true);
      expect(result).toBe(false);
    });

    it("should return false for a check-in reward expired 1 day ago (within maxDays)", () => {
      const eightDaysAgo = new Date("2025-11-22T12:00:00");
      
      const result = shouldHideCoupon(eightDaysAgo, 2, true);
      expect(result).toBe(false);
    });

    it("should return true for a check-in reward expired 3 days ago (beyond maxDays)", () => {
      const elevenDaysAgo = new Date("2025-11-19T12:00:00");
      
      const result = shouldHideCoupon(elevenDaysAgo, 2, true);
      expect(result).toBe(true);
    });
  });
});
