import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  generateDeviceFingerprint,
  getDeviceId,
  getDeviceInfo,
  saveDeviceId,
  saveLoginInfo,
  validateEmail,
  validatePhoneNumber,
} from "@/lib/deviceFingerprint";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SimpleLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SimpleLoginDialog({
  open,
  onOpenChange,
  onSuccess,
}: SimpleLoginDialogProps) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loginType, setLoginType] = useState<"phone" | "email">("phone");
  const utils = trpc.useUtils();

  // 當對話框關閉時，重置 viewport 縮放
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // 重置 viewport 縮放
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
    }
    onOpenChange(newOpen);
  };

  const loginMutation = (trpc.auth as any).simpleLogin.useMutation({
    onSuccess: async (data: any) => {
      toast.success(data.isNewUser ? "註冊成功！" : "登入成功！");
      
      // 直接更新 TRPC 快取中的使用者資料，而不是重新載入頁面
      // 這樣可以確保 useAuth hook 立即取得最新的使用者資訊
      utils.auth.me.setData(undefined, data.user);
      
      // 重置 viewport 縮放
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
      
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      toast.error(error.message || "登入失敗，請稍後再試");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證輸入
    if (loginType === "phone") {
      if (!phone) {
        toast.error("請輸入手機號碼");
        return;
      }
      if (!validatePhoneNumber(phone)) {
        toast.error("手機號碼格式錯誤，請輸入09開頭的10位數字");
        return;
      }
    } else {
      if (!email) {
        toast.error("請輸入 Email");
        return;
      }
      if (!validateEmail(email)) {
        toast.error("Email 格式錯誤");
        return;
      }
    }

    try {
      // 生成或取得裝置 ID
      let deviceId = getDeviceId();
      if (!deviceId) {
        deviceId = await generateDeviceFingerprint();
        saveDeviceId(deviceId);
      }

      // 取得裝置資訊
      const deviceInfo = getDeviceInfo();

      // 呼叫登入 API
      await loginMutation.mutateAsync({
        phone: loginType === "phone" ? phone : undefined,
        email: loginType === "email" ? email : undefined,
        deviceId,
        deviceInfo,
      });

      // 儲存登入資訊
      saveLoginInfo(
        loginType === "phone" ? phone : undefined,
        loginType === "email" ? email : undefined
      );
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">登入 / 註冊</DialogTitle>
          <DialogDescription className="text-base">
            輸入手機號碼或 Email 即可登入，無需驗證碼
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={loginType}
          onValueChange={(value) => setLoginType(value as "phone" | "email")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="phone" className="text-lg font-semibold">手機號碼</TabsTrigger>
            <TabsTrigger value="email" className="text-lg font-semibold">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="phone">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-lg font-semibold">手機號碼</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  disabled={loginMutation.isPending}
                  className="h-14 text-lg px-4"
                />
                <p className="text-base text-muted-foreground">
                  請輸入台灣手機號碼（09開頭）
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    登入中...
                  </>
                ) : (
                  "登入 / 註冊"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="email">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-lg font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="h-14 text-lg px-4"
                />
                <p className="text-base text-muted-foreground">
                  請輸入您的 Email 地址
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    登入中...
                  </>
                ) : (
                  "登入 / 註冊"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-sm text-muted-foreground text-center">
          登入即表示您同意我們的服務條款與隱私政策
        </div>
      </DialogContent>
    </Dialog>
  );
}
