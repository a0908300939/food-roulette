import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { Upload, Loader2, Check, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { WheelPreview } from "@/components/WheelPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WheelVersion = 'v1' | 'canvas' | 'rainbow' | 'redwhite' | 'colorful';

const WHEEL_VERSIONS = [
  {
    id: 'v1' as WheelVersion,
    name: '彩虹轉盤（圖片）',
    description: '彩色漸層設計，黑色外框，白色圓點裝飾',
    image: '/wheels/wheel-v1.png',
  },

  {
    id: 'canvas' as WheelVersion,
    name: '經典轉盤',
    description: '程式繪製的傳統轉盤樣式',
    image: null,
  },
  {
    id: 'rainbow' as WheelVersion,
    name: '彩虹漸層（程式繪製）',
    description: '彩色漸層設計，黑色外框，白色圓點，支援文字顯示',
    image: null,
  },
  {
    id: 'redwhite' as WheelVersion,
    name: '紅白相間（程式繪製）',
    description: '紅白相間設計，黃色外框，星星裝飾，支援文字顯示',
    image: null,
  },
  {
    id: 'colorful' as WheelVersion,
    name: '多彩區塊（程式繪製）',
    description: '多色區塊設計，黃色外框，支援文字顯示',
    image: null,
  },
];

const DEFAULT_WHEEL_IDS = ['v1', 'canvas', 'rainbow', 'redwhite', 'colorful'];

export default function WheelImageSettings() {
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [isBgUploading, setIsBgUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);


  // 轉盤版本相關
  const { data: wheelVersionData, refetch: refetchVersion } = trpc.wheel.getVersion.useQuery();
  const setVersionMutation = trpc.wheel.setVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`已切換到${WHEEL_VERSIONS.find(v => v.id === data.version)?.name}`);
      refetchVersion();
    },
    onError: (error) => {
      toast.error(`切換失敗：${error.message}`);
    },
  });

  const handleVersionChange = (version: WheelVersion) => {
    setVersionMutation.mutate({ version });
  };

  // 背景圖片相關
  const { data: bgImageData, refetch: refetchBg } = trpc.background.get.useQuery();
  const uploadBgMutation = trpc.background.upload.useMutation({
    onSuccess: () => {
      toast.success("背景圖片上傳成功！");
      refetchBg();
      setBgPreviewUrl(null);
      setIsBgUploading(false);
    },
    onError: (error) => {
      toast.error(`上傳失敗：${error.message}`);
      setIsBgUploading(false);
    },
  });
  
  const clearBgMutation = trpc.background.clear.useMutation({
    onSuccess: () => {
      toast.success("背景圖片已清除");
      refetchBg();
    },
    onError: (error) => {
      toast.error(`清除失敗：${error.message}`);
    },
  });

  const handleBgFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }

    // 檢查檔案大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片檔案不能超過 5MB");
      return;
    }

    // 預覽圖片
    const reader = new FileReader();
    reader.onload = (e) => {
      setBgPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = () => {
    if (!bgPreviewUrl) return;

    setIsBgUploading(true);
    uploadBgMutation.mutate({
      imageBase64: bgPreviewUrl,
    });
  };

  const handleBgCancel = () => {
    setBgPreviewUrl(null);
    if (bgFileInputRef.current) {
      bgFileInputRef.current.value = "";
    }
  };
  
  const handleBgClear = () => {
    if (confirm("確定要清除背景圖片嗎？")) {
      clearBgMutation.mutate();
    }
  };

  // 自訂轉盤樣式相關
  const { data: customStyles, refetch: refetchCustomStyles } = trpc.wheel.listCustomStyles.useQuery();
  const deleteCustomStyleMutation = trpc.wheel.deleteCustomStyle.useMutation({
    onSuccess: () => {
      toast.success("自訂轉盤已刪除");
      refetchCustomStyles();
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const handleDeleteCustomStyle = (id: number) => {
    deleteCustomStyleMutation.mutate({ id });
  };

  const currentVersion = wheelVersionData?.version || 'canvas';

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* 轉盤版本選擇 */}
      <Card>
        <CardHeader>
          <CardTitle>轉盤樣式選擇</CardTitle>
          <CardDescription>
            選擇您喜歡的轉盤樣式，立即套用到前台頁面
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={currentVersion}
            onValueChange={(value) => handleVersionChange(value as WheelVersion)}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {WHEEL_VERSIONS.map((version) => (
              <div key={version.id} className="relative">
                <RadioGroupItem
                  value={version.id}
                  id={version.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={version.id}
                  className="flex flex-col items-center gap-4 rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                >
                  {/* 預覽圖片 */}
                  <div className="w-full aspect-square flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                    {version.image ? (
                      <img
                        src={version.image}
                        alt={version.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <WheelPreview version={version.id as WheelVersion} size={200} />
                    )}
                  </div>
                  
                  {/* 版本資訊 */}
                  <div className="text-center space-y-1">
                    <div className="font-semibold flex items-center justify-center gap-2">
                      {version.name}
                      {currentVersion === version.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {version.description}
                    </p>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          {setVersionMutation.isPending && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在切換轉盤樣式...</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 背景圖片設定 */}
      <Card>
        <CardHeader>
          <CardTitle>背景圖片設定</CardTitle>
          <CardDescription>
            上傳自訂的背景圖片，將套用到所有頁面，建議尺寸：1920×1080 像素
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 當前背景圖片 */}
          {bgImageData?.url && !bgPreviewUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">當前背景圖片</h3>
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <img
                  src={bgImageData.url}
                  alt="當前背景"
                  className="w-full max-w-2xl h-auto object-contain"
                />
              </div>
              <Button
                onClick={handleBgClear}
                variant="destructive"
                className="w-full"
              >
                清除背景圖片
              </Button>
            </div>
          )}

          {/* 預覽新圖片 */}
          {bgPreviewUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">預覽新圖片</h3>
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <img
                  src={bgPreviewUrl}
                  alt="預覽"
                  className="w-full max-w-2xl h-auto object-contain"
                />
              </div>
            </div>
          )}

          {/* 上傳按鈕 */}
          <div className="space-y-4">
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBgFileSelect}
              className="hidden"
            />
            
            {!bgPreviewUrl ? (
              <Button
                onClick={() => bgFileInputRef.current?.click()}
                className="w-full"
                variant="outline"
              >
                <Upload className="mr-2 h-4 w-4" />
                選擇圖片
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleBgUpload}
                  disabled={isBgUploading}
                  className="flex-1"
                >
                  {isBgUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isBgUploading ? "上傳中..." : "確認上傳"}
                </Button>
                <Button
                  onClick={handleBgCancel}
                  disabled={isBgUploading}
                  variant="outline"
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            )}
          </div>

          {/* 說明 */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">圖片規格建議：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>尺寸：1920×1080 像素（或更高）</li>
              <li>格式：JPG、PNG 或 WebP</li>
              <li>檔案大小：不超過 5MB</li>
              <li>色調：建議使用柔和的色彩，系統會自動添加深色遮罩確保文字可讀性</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 自訂轉盤樣式管理 */}
      <Card>
        <CardHeader>
          <CardTitle>自訂轉盤樣式</CardTitle>
          <CardDescription>
            管理您建立的自訂轉盤設計，可以隨時刪除不需要的樣式
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customStyles && customStyles.length > 0 ? (
            <div className="space-y-4">
              {customStyles.map((style) => (
                <div
                  key={style.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{style.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {style.type === 'canvas' ? '程式繪製' : '上傳圖片'} • {style.style}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      建立於 {new Date(style.createdAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <Button
                    onClick={() => setDeleteConfirmId(style.id)}
                    variant="destructive"
                    size="sm"
                    disabled={deleteCustomStyleMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">目前沒有自訂轉盤樣式</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此自訂轉盤嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。刪除後，該轉盤樣式將永久移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteCustomStyle(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCustomStyleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  刪除中...
                </>
              ) : (
                '刪除'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
