/**
 * 偵測是否在 App 內建瀏覽器中
 * 包含：LINE、Facebook、Instagram、Twitter 等
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  
  // LINE 內建瀏覽器
  if (ua.includes('line/')) return true;
  
  // Facebook 內建瀏覽器
  if (ua.includes('fban') || ua.includes('fbav')) return true;
  
  // Instagram 內建瀏覽器
  if (ua.includes('instagram')) return true;
  
  // Twitter 內建瀏覽器
  if (ua.includes('twitter')) return true;
  
  // Messenger 內建瀏覽器
  if (ua.includes('messenger')) return true;
  
  // WeChat 內建瀏覽器
  if (ua.includes('micromessenger')) return true;
  
  return false;
}

/**
 * 取得當前瀏覽器名稱（用於顯示提示訊息）
 */
export function getInAppBrowserName(): string {
  if (typeof window === 'undefined') return 'App';
  
  const ua = window.navigator.userAgent.toLowerCase();
  
  if (ua.includes('line/')) return 'LINE';
  if (ua.includes('fban') || ua.includes('fbav')) return 'Facebook';
  if (ua.includes('instagram')) return 'Instagram';
  if (ua.includes('twitter')) return 'Twitter';
  if (ua.includes('messenger')) return 'Messenger';
  if (ua.includes('micromessenger')) return 'WeChat';
  
  return 'App';
}

/**
 * 複製文字到剪貼簿
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 優先使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 降級方案：使用 document.execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error('複製失敗:', error);
    return false;
  }
}
