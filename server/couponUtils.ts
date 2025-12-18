/**
 * 優惠券有效期檢查工具函式
 */

/**
 * 檢查優惠券是否已過期（超過建立當天 24:00）
 * @param createdAt 優惠券建立時間
 * @returns true 表示已過期，false 表示仍有效
 */
export function isCouponExpired(createdAt: Date): boolean {
  const now = new Date();
  const couponDate = new Date(createdAt);
  
  // 設定優惠券當天的 23:59:59
  const expiryDate = new Date(couponDate);
  expiryDate.setHours(23, 59, 59, 999);
  
  return now > expiryDate;
}

/**
 * 計算優惠券過期天數
 * @param createdAt 優惠券建立時間
 * @returns 過期天數（0 表示當天或未過期，1 表示過期 1 天，以此類推）
 */
export function getDaysExpired(createdAt: Date): number {
  const now = new Date();
  const couponDate = new Date(createdAt);
  
  // 設定優惠券當天的 23:59:59
  const expiryDate = new Date(couponDate);
  expiryDate.setHours(23, 59, 59, 999);
  
  if (now <= expiryDate) {
    return 0; // 未過期
  }
  
  // 計算過期天數（使用 ceil 以確保任何過期時間都算作 1 天）
  const diffMs = now.getTime() - expiryDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 檢查優惠券是否應該隱藏（過期超過指定天數）
 * @param createdAt 優惠券建立時間
 * @param maxDays 最大保留天數（預設 2 天）
 * @returns true 表示應該隱藏，false 表示仍然顯示
 */
export function shouldHideCoupon(createdAt: Date, maxDays: number = 2): boolean {
  const daysExpired = getDaysExpired(createdAt);
  return daysExpired > maxDays;
}
