import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * 臨時路由：捕捉 LINE 錯誤的跳轉（/line 而不是 /line/callback）
 * 並自動重定向到正確的 /line/callback 路由
 */
export default function LineRedirect() {
  useEffect(() => {
    // 記錄完整的 URL 以便診斷
    const fullUrl = window.location.href;
    console.log('[LINE Redirect] Full URL:', fullUrl);
    console.log('[LINE Redirect] Search params:', window.location.search);
    console.log('[LINE Redirect] Hash:', window.location.hash);
    
    // 取得當前 URL 的查詢參數（檢查 query 和 hash）
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // 移除開頭的 #
    
    // 優先從 search 取得，如果沒有則從 hash 取得
    const code = searchParams.get("code") || hashParams.get("code");
    const state = searchParams.get("state") || hashParams.get("state");
    const error = searchParams.get("error") || hashParams.get("error");
    const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

    console.log('[LINE Redirect] Search Parameters:', {
      code: searchParams.get("code"),
      state: searchParams.get("state"),
      error: searchParams.get("error")
    });
    console.log('[LINE Redirect] Hash Parameters:', {
      code: hashParams.get("code"),
      state: hashParams.get("state"),
      error: hashParams.get("error")
    });
    console.log('[LINE Redirect] Final Parameters:', { code, state, error, errorDescription });

    // 如果 LINE 返回錯誤
    if (error) {
      console.error('[LINE Redirect] LINE error:', error, errorDescription);
      alert(`LINE 授權失敗: ${errorDescription || error}`);
      window.location.href = "/";
      return;
    }

    // 如果有 code 參數，表示這是 LINE 的回調
    if (code) {
      console.log('[LINE Redirect] Redirecting to callback with code');
      // 重定向到正確的 /line/callback 路由
      const redirectUrl = `/line/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
      window.location.href = redirectUrl;
    } else {
      // 如果沒有 code 參數，顯示詳細訊息
      console.warn('[LINE Redirect] No code parameter found');
      console.log('[LINE Redirect] Full URL for debugging:', fullUrl);
      alert(`缺少授權碼。\n\n完整 URL: ${fullUrl}\n\n請截圖此訊息並聯繫管理員。`);
      window.location.href = "/";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            重定向中...
          </CardTitle>
          <CardDescription>正在處理 LINE 登入，請稍候</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
