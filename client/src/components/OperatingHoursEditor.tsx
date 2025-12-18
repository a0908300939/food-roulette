import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Copy } from "lucide-react";

export interface TimeShift {
  start: string;
  end: string;
}

export interface DaySchedule {
  closed: boolean;
  shifts: TimeShift[];
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface OperatingHoursEditorProps {
  value: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
}

const dayNames: { key: keyof WeekSchedule; label: string }[] = [
  { key: "monday", label: "星期一" },
  { key: "tuesday", label: "星期二" },
  { key: "wednesday", label: "星期三" },
  { key: "thursday", label: "星期四" },
  { key: "friday", label: "星期五" },
  { key: "saturday", label: "星期六" },
  { key: "sunday", label: "星期日" },
];

// 生成時間選項 (00:00 - 23:30, 每 30 分鐘)
const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      options.push(`${h}:${m}`);
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

export function OperatingHoursEditor({ value, onChange }: OperatingHoursEditorProps) {
  const updateDay = (day: keyof WeekSchedule, updates: Partial<DaySchedule>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...updates },
    });
  };

  const addShift = (day: keyof WeekSchedule) => {
    const currentShifts = value[day].shifts;
    const lastShift = currentShifts[currentShifts.length - 1];
    const newStart = lastShift ? lastShift.end : "10:00";
    const newEnd = "22:00";
    
    updateDay(day, {
      shifts: [...currentShifts, { start: newStart, end: newEnd }],
    });
  };

  const removeShift = (day: keyof WeekSchedule, index: number) => {
    const shifts = value[day].shifts.filter((_, i) => i !== index);
    updateDay(day, { shifts });
  };

  const updateShift = (
    day: keyof WeekSchedule,
    index: number,
    field: "start" | "end",
    time: string
  ) => {
    const shifts = [...value[day].shifts];
    shifts[index] = { ...shifts[index], [field]: time };
    updateDay(day, { shifts });
  };

  const copyToAllDays = (sourceDay: keyof WeekSchedule) => {
    const sourceSchedule = value[sourceDay];
    const newSchedule = { ...value };
    dayNames.forEach(({ key }) => {
      newSchedule[key] = {
        closed: sourceSchedule.closed,
        shifts: sourceSchedule.shifts.map(s => ({ ...s })),
      };
    });
    onChange(newSchedule);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {dayNames.map(({ key, label }) => (
          <div
            key={key}
            className="border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors"
          >
            {/* 日期標題與公休選項 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{label}</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${key}-closed`}
                  checked={value[key].closed}
                  onCheckedChange={(checked) =>
                    updateDay(key, { closed: !!checked })
                  }
                />
                <Label
                  htmlFor={`${key}-closed`}
                  className="text-sm cursor-pointer text-muted-foreground"
                >
                  公休
                </Label>
              </div>
            </div>

            {/* 營業時段 */}
            {!value[key].closed && (
              <div className="space-y-2">
                {value[key].shifts.map((shift, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-background rounded-md p-2"
                  >
                    <span className="text-xs text-muted-foreground w-12">
                      {index === 0 ? "上午班" : index === 1 ? "下午班" : `班次${index + 1}`}
                    </span>
                    
                    {/* 開始時間 */}
                    <Select
                      value={shift.start}
                      onValueChange={(time) => updateShift(key, index, "start", time)}
                    >
                      <SelectTrigger className="w-[110px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-sm text-muted-foreground">至</span>

                    {/* 結束時間 */}
                    <Select
                      value={shift.end}
                      onValueChange={(time) => updateShift(key, index, "end", time)}
                    >
                      <SelectTrigger className="w-[110px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* 刪除班次按鈕 */}
                    {value[key].shifts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeShift(key, index)}
                        className="h-9 w-9 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* 新增班次按鈕 */}
                <div className="flex gap-2">
                  {value[key].shifts.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addShift(key)}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      新增班次
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToAllDays(key)}
                    className="h-8 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    套用全部
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        提示：每天最多可設定 3 個營業時段，點擊「套用全部」可將該天的設定套用到整週
      </p>
    </div>
  );
}

// 輔助函式：將舊格式轉換為新格式
export function convertLegacyToNewFormat(operatingHours: string): WeekSchedule {
  const defaultSchedule: WeekSchedule = {
    monday: { closed: false, shifts: [{ start: "10:00", end: "22:00" }] },
    tuesday: { closed: false, shifts: [{ start: "10:00", end: "22:00" }] },
    wednesday: { closed: false, shifts: [{ start: "10:00", end: "22:00" }] },
    thursday: { closed: false, shifts: [{ start: "10:00", end: "22:00" }] },
    friday: { closed: false, shifts: [{ start: "10:00", end: "22:00" }] },
    saturday: { closed: false, shifts: [{ start: "10:00", end: "22:00" }] },
    sunday: { closed: false, shifts: [{ start: "10:00", end: "22:00" }] },
  };

  try {
    const parsed = JSON.parse(operatingHours);
    const schedule: WeekSchedule = { ...defaultSchedule };

    Object.entries(parsed).forEach(([day, value]) => {
      if (day in schedule) {
        const dayKey = day as keyof WeekSchedule;
        
        // 處理舊格式：{ start: "10:00", end: "22:00", closed: false }
        if (typeof value === "object" && value !== null && "start" in value) {
          const v = value as { start: string; end: string; closed?: boolean };
          schedule[dayKey] = {
            closed: v.closed || false,
            shifts: [{ start: v.start, end: v.end }],
          };
        }
        // 處理字串格式："10:00-22:00" 或 "closed"
        else if (typeof value === "string") {
          if (value === "closed") {
            schedule[dayKey] = { closed: true, shifts: [{ start: "10:00", end: "22:00" }] };
          } else {
            const [start, end] = value.split("-");
            schedule[dayKey] = { closed: false, shifts: [{ start, end }] };
          }
        }
        // 處理新格式：{ closed: false, shifts: [...] }
        else if (typeof value === "object" && value !== null && "shifts" in value) {
          schedule[dayKey] = value as DaySchedule;
        }
      }
    });

    return schedule;
  } catch {
    return defaultSchedule;
  }
}

// 輔助函式：將新格式轉換為 JSON 字串
export function convertNewFormatToJSON(schedule: WeekSchedule): string {
  const result: Record<string, { closed: boolean; shifts: TimeShift[] }> = {};
  
  Object.entries(schedule).forEach(([day, daySchedule]) => {
    result[day] = {
      closed: daySchedule.closed,
      shifts: daySchedule.shifts,
    };
  });

  return JSON.stringify(result);
}
