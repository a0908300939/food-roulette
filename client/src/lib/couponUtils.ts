/**
 * 優惠券有效期檢查工具函式（前端版本）
 */

/**
 * 檢查優惠券是否已過期
 * - 一般優惠券：超過建立當天 24:00 即過期
 * - 簽到獎勵：建立後 7 天內有效，第 8 天才過期
 * @param createdAt 優惠券建立時間
 * @param isCheckInReward 是否為簽到獎勵（預設 false）
 * @returns true 表示已過期，false 表示仍有效
 */
export function isCouponExpired(createdAt: Date, isCheckInReward: boolean = false): boolean {
  const now = new Date();
  const couponDate = new Date(createdAt);
  
  if (isCheckInReward) {
    // 簽到獎勵：建立後 7 天內有效
    // 計算 7 天後的 23:59:59
    const expiryDate = new Date(couponDate);
    expiryDate.setDate(expiryDate.getDate() + 7);
    expiryDate.setHours(23, 59, 59, 999);
    return now > expiryDate;
  } else {
    // 一般優惠券：當天 23:59:59 後過期
    const expiryDate = new Date(couponDate);
    expiryDate.setHours(23, 59, 59, 999);
    return now > expiryDate;
  }
}

/**
 * 計算優惠券過期天數
 * @param createdAt 優惠券建立時間
 * @param isCheckInReward 是否為簽到獎勵（預設 false）
 * @returns 過期天數（0 表示當天或未過期，1 表示過期 1 天，以此類推）
 */
export function getDaysExpired(createdAt: Date, isCheckInReward: boolean = false): number {
  const now = new Date();
  const couponDate = new Date(createdAt);
  
  let expiryDate: Date;
  if (isCheckInReward) {
    // 簽到獎勵：7 天後的 23:59:59
    expiryDate = new Date(couponDate);
    expiryDate.setDate(expiryDate.getDate() + 7);
    expiryDate.setHours(23, 59, 59, 999);
  } else {
    // 一般優惠券：當天的 23:59:59
    expiryDate = new Date(couponDate);
    expiryDate.setHours(23, 59, 59, 999);
  }
  
  if (now <= expiryDate) {
    return 0; // 未過期
  }
  
  // 計算過期天數
  const diffMs = now.getTime() - expiryDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 檢查優惠券是否應該隱藏（過期超過指定天數）
 * @param createdAt 優惠券建立時間
 * @param maxDays 最大保留天數（預設 2 天）
 * @param isCheckInReward 是否為簽到獎勵（預設 false）
 * @returns true 表示應該隱藏，false 表示仍然顯示
 */
export function shouldHideCoupon(createdAt: Date, maxDays: number = 2, isCheckInReward: boolean = false): boolean {
  const daysExpired = getDaysExpired(createdAt, isCheckInReward);
  return daysExpired > maxDays;
}
