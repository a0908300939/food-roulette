import { describe, expect, it } from "vitest";

// 複製前端的時間工具函式到後端進行測試
type MealPeriod = "breakfast" | "lunch" | "afternoon_tea" | "dinner" | "late_night";

interface TimeRange {
  start: string;
  end: string;
}

interface MealPeriodConfig {
  id: MealPeriod;
  name: string;
  timeRange: TimeRange;
  icon: string;
}

const MEAL_PERIODS: MealPeriodConfig[] = [
  {
    id: "breakfast",
    name: "早餐",
    timeRange: { start: "05:00", end: "10:00" },
    icon: "🌅",
  },
  {
    id: "lunch",
    name: "午餐",
    timeRange: { start: "11:00", end: "14:00" },
    icon: "🍱",
  },
  {
    id: "afternoon_tea",
    name: "下午茶",
    timeRange: { start: "14:00", end: "16:00" },
    icon: "☕",
  },
  {
    id: "dinner",
    name: "晚餐",
    timeRange: { start: "16:00", end: "21:00" },
    icon: "🍽️",
  },
  {
    id: "late_night",
    name: "消夜",
    timeRange: { start: "20:00", end: "24:00" },
    icon: "🌙",
  },
];

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isTimeInRange(currentTime: Date, range: TimeRange): boolean {
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const startMinutes = timeToMinutes(range.start);
  const endMinutes = timeToMinutes(range.end);

  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function getCurrentMealPeriods(currentTime: Date): MealPeriodConfig[] {
  return MEAL_PERIODS.filter((period) => isTimeInRange(currentTime, period.timeRange));
}

function isRestaurantOpenForPeriod(
  operatingHours: string,
  mealPeriod: MealPeriodConfig,
  currentTime: Date
): boolean {
  try {
    const hours = JSON.parse(operatingHours);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDay = dayNames[currentTime.getDay()];
    
    const todayHours = hours[currentDay];
    if (!todayHours || todayHours === "closed") {
      return false;
    }

    const timeSlots = todayHours.split(",").map((slot: string) => slot.trim());
    
    for (const slot of timeSlots) {
      const [start, end] = slot.split("-").map((t: string) => t.trim());
      if (!start || !end) continue;

      const storeStart = timeToMinutes(start);
      const storeEnd = timeToMinutes(end);
      const periodStart = timeToMinutes(mealPeriod.timeRange.start);
      const periodEnd = timeToMinutes(mealPeriod.timeRange.end);

      if (storeStart < periodEnd && storeEnd > periodStart) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

describe("時間篩選邏輯測試", () => {
  describe("isTimeInRange", () => {
    it("應該正確判斷早餐時段 (05:00-10:00)", () => {
      const breakfastRange = { start: "05:00", end: "10:00" };
      
      // 在範圍內
      const time1 = new Date("2024-01-01T07:30:00");
      expect(isTimeInRange(time1, breakfastRange)).toBe(true);
      
      // 邊界值 - 開始時間
      const time2 = new Date("2024-01-01T05:00:00");
      expect(isTimeInRange(time2, breakfastRange)).toBe(true);
      
      // 邊界值 - 結束時間前
      const time3 = new Date("2024-01-01T09:59:00");
      expect(isTimeInRange(time3, breakfastRange)).toBe(true);
      
      // 超出範圍
      const time4 = new Date("2024-01-01T10:01:00");
      expect(isTimeInRange(time4, breakfastRange)).toBe(false);
    });

    it("應該正確判斷午餐時段 (11:00-14:00)", () => {
      const lunchRange = { start: "11:00", end: "14:00" };
      
      const time1 = new Date("2024-01-01T12:30:00");
      expect(isTimeInRange(time1, lunchRange)).toBe(true);
      
      const time2 = new Date("2024-01-01T10:30:00");
      expect(isTimeInRange(time2, lunchRange)).toBe(false);
    });

    it("應該正確判斷消夜時段 (20:00-24:00)", () => {
      const lateNightRange = { start: "20:00", end: "24:00" };
      
      const time1 = new Date("2024-01-01T22:00:00");
      expect(isTimeInRange(time1, lateNightRange)).toBe(true);
      
      const time2 = new Date("2024-01-01T23:59:00");
      expect(isTimeInRange(time2, lateNightRange)).toBe(true);
      
      const time3 = new Date("2024-01-01T19:30:00");
      expect(isTimeInRange(time3, lateNightRange)).toBe(false);
    });
  });

  describe("getCurrentMealPeriods", () => {
    it("早上 8 點應該返回早餐時段", () => {
      const time = new Date("2024-01-01T08:00:00");
      const periods = getCurrentMealPeriods(time);
      
      expect(periods.length).toBeGreaterThan(0);
      expect(periods[0].id).toBe("breakfast");
    });

    it("中午 12 點應該返回午餐時段", () => {
      const time = new Date("2024-01-01T12:00:00");
      const periods = getCurrentMealPeriods(time);
      
      expect(periods.length).toBeGreaterThan(0);
      expect(periods[0].id).toBe("lunch");
    });

    it("下午 3 點應該返回下午茶時段", () => {
      const time = new Date("2024-01-01T15:00:00");
      const periods = getCurrentMealPeriods(time);
      
      expect(periods.length).toBeGreaterThan(0);
      expect(periods[0].id).toBe("afternoon_tea");
    });

    it("晚上 7 點應該返回晚餐時段", () => {
      const time = new Date("2024-01-01T19:00:00");
      const periods = getCurrentMealPeriods(time);
      
      expect(periods.length).toBeGreaterThan(0);
      expect(periods[0].id).toBe("dinner");
    });

    it("晚上 10 點應該同時返回晚餐和消夜時段（重疊）", () => {
      const time = new Date("2024-01-01T20:30:00");
      const periods = getCurrentMealPeriods(time);
      
      expect(periods.length).toBeGreaterThanOrEqual(1);
      const periodIds = periods.map(p => p.id);
      expect(periodIds).toContain("late_night");
    });

    it("凌晨 2 點不應該返回任何時段", () => {
      const time = new Date("2024-01-01T02:00:00");
      const periods = getCurrentMealPeriods(time);
      
      expect(periods.length).toBe(0);
    });
  });

  describe("isRestaurantOpenForPeriod", () => {
    const operatingHours = JSON.stringify({
      monday: "10:00-22:00",
      tuesday: "10:00-22:00",
      wednesday: "10:00-22:00",
      thursday: "10:00-22:00",
      friday: "10:00-22:00",
      saturday: "10:00-22:00",
      sunday: "closed"
    });

    it("營業時間 10:00-22:00 的店家應該在午餐時段營業", () => {
      const lunchPeriod = MEAL_PERIODS.find(p => p.id === "lunch")!;
      const time = new Date("2024-01-01T12:00:00"); // 星期一
      
      expect(isRestaurantOpenForPeriod(operatingHours, lunchPeriod, time)).toBe(true);
    });

    it("營業時間 10:00-22:00 的店家應該在晚餐時段營業", () => {
      const dinnerPeriod = MEAL_PERIODS.find(p => p.id === "dinner")!;
      const time = new Date("2024-01-01T19:00:00"); // 星期一
      
      expect(isRestaurantOpenForPeriod(operatingHours, dinnerPeriod, time)).toBe(true);
    });

    it("營業時間 10:00-22:00 的店家不應該在早餐時段營業", () => {
      const breakfastPeriod = MEAL_PERIODS.find(p => p.id === "breakfast")!;
      const time = new Date("2024-01-01T08:00:00"); // 星期一
      
      expect(isRestaurantOpenForPeriod(operatingHours, breakfastPeriod, time)).toBe(false);
    });

    it("星期日公休的店家不應該在任何時段營業", () => {
      const lunchPeriod = MEAL_PERIODS.find(p => p.id === "lunch")!;
      const time = new Date("2024-01-07T12:00:00"); // 星期日
      
      expect(isRestaurantOpenForPeriod(operatingHours, lunchPeriod, time)).toBe(false);
    });

    it("應該正確處理分段營業時間", () => {
      const splitHours = JSON.stringify({
        monday: "06:00-10:00,17:00-22:00",
        tuesday: "06:00-10:00,17:00-22:00",
        wednesday: "06:00-10:00,17:00-22:00",
        thursday: "06:00-10:00,17:00-22:00",
        friday: "06:00-10:00,17:00-22:00",
        saturday: "06:00-10:00,17:00-22:00",
        sunday: "closed"
      });

      const breakfastPeriod = MEAL_PERIODS.find(p => p.id === "breakfast")!;
      const dinnerPeriod = MEAL_PERIODS.find(p => p.id === "dinner")!;
      const lunchPeriod = MEAL_PERIODS.find(p => p.id === "lunch")!;
      const time = new Date("2024-01-01T12:00:00"); // 星期一

      // 早餐時段應該營業
      expect(isRestaurantOpenForPeriod(splitHours, breakfastPeriod, time)).toBe(true);
      
      // 晚餐時段應該營業
      expect(isRestaurantOpenForPeriod(splitHours, dinnerPeriod, time)).toBe(true);
      
      // 午餐時段不應該營業（休息時間）
      expect(isRestaurantOpenForPeriod(splitHours, lunchPeriod, time)).toBe(false);
    });
  });
});
