import crypto from 'crypto';

/**
 * 生成裝置指紋
 * 使用 User Agent + Screen Resolution + Timezone 生成唯一識別碼
 */
export function generateDeviceFingerprint(
  userAgent: string,
  screenResolution: string,
  timezone: string
): string {
  const data = `${userAgent}|${screenResolution}|${timezone}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 驗證手機號碼格式（台灣手機號碼：09xxxxxxxx）
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^09\d{8}$/;
  return phoneRegex.test(phone);
}

/**
 * 驗證 Email 格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
