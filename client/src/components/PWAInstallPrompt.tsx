import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, Share2, Plus, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 檢查是否為 iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 檢查是否已經是獨立模式（已安裝）
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // 檢查是否已經關閉過提示
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed || standalone) {
      return;
    }

    // Android: 監聽 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // 延遲 3 秒顯示提示（避免干擾使用者）
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS: 自動顯示提示
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // 顯示安裝提示
    await deferredPrompt.prompt();

    // 等待使用者回應
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // 如果已經是獨立模式，不顯示提示
  if (isStandalone) {
    return null;
  }

  // 如果不顯示提示，返回 null
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-500 max-w-md mx-auto">
      <Card className="glass-card border-primary/20 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">安裝到主畫面</CardTitle>
                <CardDescription className="text-sm mt-1">
                  快速開啟，像 App 一樣使用
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {isIOS ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">點擊 Safari 底部的「分享」按鈕</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Share2 className="h-5 w-5" />
                      <span className="text-xs">（螢幕底部中央的方框加箭頭圖示）</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">向下滑動，找到「加入主畫面」</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">（通常在選單中間位置）</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">點擊「加入」完成安裝</p>
                    <p className="text-xs text-muted-foreground">
                      App 圖示會出現在您的主畫面上
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDismiss}
              >
                知道了
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">點擊下方「立即安裝」按鈕</p>
                    <p className="text-xs text-muted-foreground">
                      瀏覽器會自動顯示安裝確認視窗
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">在彈出視窗中點擊「安裝」</p>
                    <p className="text-xs text-muted-foreground">
                      確認後即可完成安裝
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">從主畫面開啟 App</p>
                    <p className="text-xs text-muted-foreground">
                      App 圖示會出現在您的手機桌面上
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleInstallClick}
                >
                  <Download className="h-4 w-4 mr-2" />
                  立即安裝
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                >
                  稍後
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              💡 安裝後可享受更快的載入速度與離線使用功能
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
