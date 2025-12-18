import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LineCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  
  const callbackMutation = trpc.lineAuth.callback.useMutation({
    onSuccess: () => {
      // 登入成功，跳轉到首頁
      window.location.href = "/";
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    // 記錄完整的回調 URL 以便診斷
    const fullUrl = window.location.href;
    console.log('[LINE Callback] Full URL:', fullUrl);
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    console.log('[LINE Callback] Parameters:', { code, state, error, errorDescription });

    // 如果 LINE 返回錯誤
    if (error) {
      setError(`LINE 授權失敗: ${errorDescription || error}`);
      return;
    }

    if (!code) {
      // 顯示更詳細的錯誤訊息
      const debugInfo = `缺少授權碼。\n\n請確認：\n1. 是否完成 LINE 授權\n2. 是否點擊「許可」按鈕\n\nURL: ${fullUrl.substring(0, 100)}...`;
      setError(debugInfo);
      return;
    }

    // 取得當前的 redirect URI
    const redirectUri = `${window.location.origin}/line/callback`;
    console.log('[LINE Callback] Redirect URI:', redirectUri);

    // 呼叫後端處理 LINE Login 回調
    callbackMutation.mutate({ code, redirectUri });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>登入失敗</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              返回首頁
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            處理 LINE 登入中...
          </CardTitle>
          <CardDescription>請稍候，正在完成登入流程</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
