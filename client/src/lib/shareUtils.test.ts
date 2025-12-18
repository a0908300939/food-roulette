import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShareText, shareToLine, shareToFacebook, shareWithWebShareAPI, type ShareCouponData } from './shareUtils';

describe('shareUtils', () => {
  const mockCouponData: ShareCouponData = {
    couponTitle: '9折優惠券',
    restaurantName: '【草屯總店】傳奇車輪燒',
    restaurantAddress: '南投縣草屯鎮中正路609號',
    expiryDate: '2025/11/26',
    description: '平日 11:00-14:00 限定！來【草屯總店】傳奇車輪燒，內用外帶都享全單 9 折優惠！',
  };

  describe('generateShareText', () => {
    it('應該生成正確的分享文字', () => {
      const text = generateShareText(mockCouponData);
      
      expect(text).toContain('🎉 我在「草屯美食轉轉樂」抽到優惠券了！');
      expect(text).toContain('🎫 9折優惠券');
      expect(text).toContain('🏪 【草屯總店】傳奇車輪燒');
      expect(text).toContain('📝 平日 11:00-14:00 限定');
      expect(text).toContain('📍 南投縣草屯鎮中正路609號');
      expect(text).toContain('⏰ 有效期限：2025/11/26');
      expect(text).toContain('快來一起轉轉盤，抽取專屬優惠券吧！');
    });

    it('應該處理沒有描述的情況', () => {
      const dataWithoutDescription = { ...mockCouponData, description: undefined };
      const text = generateShareText(dataWithoutDescription);
      
      expect(text).not.toContain('📝');
      expect(text).toContain('🎫 9折優惠券');
    });
  });

  describe('shareToLine', () => {
    beforeEach(() => {
      // Mock window.open
      vi.stubGlobal('window', {
        open: vi.fn(),
        location: {
          origin: 'https://example.com',
        },
      });
    });

    it('應該呼叫 window.open 並使用正確的 LINE URL', () => {
      shareToLine(mockCouponData);
      
      expect(window.open).toHaveBeenCalledTimes(1);
      const callArgs = (window.open as any).mock.calls[0];
      expect(callArgs[0]).toContain('https://social-plugins.line.me/lineit/share');
      expect(callArgs[0]).toContain('url=');
      expect(callArgs[0]).toContain('text=');
      expect(callArgs[1]).toBe('_blank');
      expect(callArgs[2]).toBe('width=600,height=600');
    });
  });

  describe('shareToFacebook', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {
        open: vi.fn(),
        location: {
          origin: 'https://example.com',
        },
      });
    });

    it('應該呼叫 window.open 並使用正確的 Facebook URL', () => {
      shareToFacebook(mockCouponData);
      
      expect(window.open).toHaveBeenCalledTimes(1);
      const callArgs = (window.open as any).mock.calls[0];
      expect(callArgs[0]).toContain('https://www.facebook.com/sharer/sharer.php');
      expect(callArgs[0]).toContain('u=');
      expect(callArgs[0]).toContain('quote=');
      expect(callArgs[1]).toBe('_blank');
      expect(callArgs[2]).toBe('width=600,height=600');
    });
  });

  describe('shareWithWebShareAPI', () => {
    it('應該在不支援 Web Share API 時返回 false', async () => {
      vi.stubGlobal('navigator', {
        share: undefined,
      });

      const result = await shareWithWebShareAPI(mockCouponData);
      expect(result).toBe(false);
    });

    it('應該在支援 Web Share API 時呼叫 navigator.share', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        share: mockShare,
      });
      vi.stubGlobal('window', {
        location: {
          origin: 'https://example.com',
        },
      });

      const result = await shareWithWebShareAPI(mockCouponData);
      
      expect(result).toBe(true);
      expect(mockShare).toHaveBeenCalledTimes(1);
      expect(mockShare).toHaveBeenCalledWith({
        title: '草屯美食轉轉樂 - 我的優惠券',
        text: expect.stringContaining('🎉 我在「草屯美食轉轉樂」抽到優惠券了！'),
        url: 'https://example.com',
      });
    });

    it('應該在使用者取消分享時返回 false', async () => {
      const mockShare = vi.fn().mockRejectedValue(new Error('User cancelled'));
      vi.stubGlobal('navigator', {
        share: mockShare,
      });
      vi.stubGlobal('window', {
        location: {
          origin: 'https://example.com',
        },
      });

      const result = await shareWithWebShareAPI(mockCouponData);
      expect(result).toBe(false);
    });
  });
});
