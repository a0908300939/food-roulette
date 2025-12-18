/**
 * 生成裝置指紋（前端版本）
 * 使用 User Agent + Screen Resolution + Timezone 生成唯一識別碼
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const userAgent = navigator.userAgent;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const data = `${userAgent}|${screenResolution}|${timezone}`;
  
  // 使用 Web Crypto API 生成 SHA-256 hash
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * 取得裝置資訊
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
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

/**
 * 儲存裝置 ID 到 localStorage
 */
export function saveDeviceId(deviceId: string) {
  localStorage.setItem('deviceId', deviceId);
}

/**
 * 從 localStorage 讀取裝置 ID
 */
export function getDeviceId(): string | null {
  return localStorage.getItem('deviceId');
}

/**
 * 儲存登入資訊到 localStorage
 */
export function saveLoginInfo(phone?: string, email?: string) {
  if (phone) {
    localStorage.setItem('loginPhone', phone);
  }
  if (email) {
    localStorage.setItem('loginEmail', email);
  }
}

/**
 * 從 localStorage 讀取登入資訊
 */
export function getLoginInfo(): { phone?: string; email?: string } {
  return {
    phone: localStorage.getItem('loginPhone') || undefined,
    email: localStorage.getItem('loginEmail') || undefined,
  };
}

/**
 * 清除登入資訊
 */
export function clearLoginInfo() {
  localStorage.removeItem('deviceId');
  localStorage.removeItem('loginPhone');
  localStorage.removeItem('loginEmail');
}
