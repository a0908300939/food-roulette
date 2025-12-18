/**
 * 分享功能 Utility 函數
 * 支援 LINE 和 Facebook 分享
 */

export interface ShareCouponData {
  couponTitle: string;
  restaurantName: string;
  restaurantAddress: string;
  expiryDate: string;
  description?: string;
}

/**
 * 生成分享文字內容
 */
export function generateShareText(data: ShareCouponData): string {
  const { couponTitle, restaurantName, restaurantAddress, expiryDate, description } = data;
  
  let text = `🎉 我在「草屯美食轉轉樂」抽到優惠券了！\n\n`;
  text += `🎫 ${couponTitle}\n`;
  text += `🏪 ${restaurantName}\n`;
  if (description) {
    text += `📝 ${description}\n`;
  }
  text += `📍 ${restaurantAddress}\n`;
  text += `⏰ 有效期限：${expiryDate}\n\n`;
  text += `快來一起轉轉盤，抽取專屬優惠券吧！`;
  
  return text;
}

/**
 * 分享到 LINE
 * 使用 LINE 官方分享 API
 */
export function shareToLine(data: ShareCouponData): void {
  const text = generateShareText(data);
  const url = window.location.origin;
  
  // LINE 分享 URL
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  
  // 在新視窗開啟
  window.open(lineUrl, '_blank', 'width=600,height=600');
}

/**
 * 分享到 Facebook
 * 使用 Facebook Share Dialog
 */
export function shareToFacebook(data: ShareCouponData): void {
  const text = generateShareText(data);
  const url = window.location.origin;
  
  // Facebook 分享 URL
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
  
  // 在新視窗開啟
  window.open(fbUrl, '_blank', 'width=600,height=600');
}

/**
 * 使用 Web Share API（如果瀏覽器支援）
 * 返回 'success' 表示分享成功
 * 返回 'cancelled' 表示使用者取消
 * 返回 'unsupported' 表示不支援 Web Share API
 * 返回 'error' 表示發生錯誤
 */
export async function shareWithWebShareAPI(data: ShareCouponData): Promise<'success' | 'cancelled' | 'unsupported' | 'error'> {
  if (!navigator.share) {
    console.log('Web Share API not supported');
    return 'unsupported';
  }
  
  try {
    const text = generateShareText(data);
    const url = window.location.origin;
    
    console.log('Attempting to share with Web Share API...');
    
    await navigator.share({
      title: '草屯美食轉轉樂 - 我的優惠券',
      text: text,
      url: url,
    });
    
    console.log('Share successful!');
    return 'success';
  } catch (error) {
    // 使用者取消分享或發生錯誤
    if (error instanceof Error && error.name === 'AbortError') {
      // 使用者取消分享
      console.log('User cancelled share');
      return 'cancelled';
    } else {
      console.error('Web Share API error:', error);
      return 'error';
    }
  }
}

/**
 * 複製分享連結到剪貼簿
 * 用於不支援 Web Share API 的瀏覽器
 */
export async function copyShareLink(data: ShareCouponData): Promise<boolean> {
  try {
    const text = generateShareText(data);
    const url = window.location.origin;
    const fullText = `${text}\n\n${url}`;
    
    await navigator.clipboard.writeText(fullText);
    return true;
  } catch (error) {
    console.error('Copy to clipboard error:', error);
    return false;
  }
}
