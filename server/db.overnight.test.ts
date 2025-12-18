import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * 模擬 isRestaurantOpen 函數的邏輯進行測試
 * 這個測試檔案驗證跨午夜營業時間的支援
 */

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isRestaurantOpenForTime(
  operatingHours: string,
  testTime: Date
): boolean {
  try {
    const hours = JSON.parse(operatingHours);
    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][testTime.getDay()];
    const todayHours = hours[dayOfWeek];

    if (!todayHours || todayHours === "休息") {
      return false;
    }

    // 支援新的 JSON 物件格式
    if (typeof todayHours === "object" && todayHours !== null) {
      if (todayHours.closed === true) {
        return false;
      }

      // 如果有 shifts 陣列，檢查任何班次是否營業中
      if (Array.isArray(todayHours.shifts)) {
        const currentHour = testTime.getHours();
        const currentMinute = testTime.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        for (const shift of todayHours.shifts) {
          const [startHour, startMinute] = shift.start.split(":").map(Number);
          const [endHour, endMinute] = shift.end.split(":").map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;

          // 處理跨午夜的情況
          if (endTime <= startTime) {
            if (currentTime >= startTime || currentTime < endTime) {
              return true;
            }
          } else {
            if (currentTime >= startTime && currentTime < endTime) {
              return true;
            }
          }
        }
        return false;
      }

      // 向後相容：支援舊的單班次格式
      if (todayHours.start && todayHours.end) {
        const [openHour, openMinute] = todayHours.start.split(":").map(Number);
        const [closeHour, closeMinute] = todayHours.end.split(":").map(Number);

        const currentHour = testTime.getHours();
        const currentMinute = testTime.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        const openingTime = openHour * 60 + openMinute;
        const closingTime = closeHour * 60 + closeMinute;

        // 處理跨午夜的情況
        if (closingTime <= openingTime) {
          return currentTime >= openingTime || currentTime < closingTime;
        } else {
          return currentTime >= openingTime && currentTime < closingTime;
        }
      }

      return true;
    }

    // 支援舊的字串格式
    if (typeof todayHours === "string") {
      const [openTime, closeTime] = todayHours.split("-");
      if (!openTime || !closeTime) {
        return false;
      }

      const [openHour, openMinute] = openTime.split(":").map(Number);
      const [closeHour, closeMinute] = closeTime.split(":").map(Number);

      const currentHour = testTime.getHours();
      const currentMinute = testTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      const openingTime = openHour * 60 + openMinute;
      const closingTime = closeHour * 60 + closeMinute;

      // 處理跨午夜的情況
      if (closingTime <= openingTime) {
        return currentTime >= openingTime || currentTime < closingTime;
      } else {
        return currentTime >= openingTime && currentTime < closingTime;
      }
    }

    return false;
  } catch (error) {
    console.error("Error parsing operating hours:", error);
    return true;
  }
}

describe("Overnight Operating Hours", () => {
  // 建立一個週三的日期供測試使用
  function createTestDate(hour: number, minute: number = 0): Date {
    const date = new Date(2025, 10, 26); // 2025年11月26日 (週三)
    date.setHours(hour, minute, 0, 0);
    return date;
  }

  describe("Shifts Format (20:00-05:00)", () => {
    const overnightShifts = JSON.stringify({
      sunday: {
        closed: false,
        shifts: [
          { start: "20:00", end: "05:00" },
        ],
      },
      monday: {
        closed: false,
        shifts: [
          { start: "20:00", end: "05:00" },
        ],
      },
      tuesday: {
        closed: false,
        shifts: [
          { start: "20:00", end: "05:00" },
        ],
      },
      wednesday: {
        closed: false,
        shifts: [
          { start: "20:00", end: "05:00" },
        ],
      },
      thursday: {
        closed: false,
        shifts: [
          { start: "20:00", end: "05:00" },
        ],
      },
      friday: {
        closed: false,
        shifts: [
          { start: "20:00", end: "05:00" },
        ],
      },
      saturday: {
        closed: false,
        shifts: [
          { start: "20:00", end: "05:00" },
        ],
      },
    });

    it("should return true at 20:00 (opening time)", () => {
      const testTime = createTestDate(20, 0);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(true);
    });

    it("should return true at 22:00 (night time)", () => {
      const testTime = createTestDate(22, 0);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(true);
    });

    it("should return true at 23:59 (before midnight)", () => {
      const testTime = createTestDate(23, 59);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(true);
    });

    it("should return true at 00:30 (after midnight)", () => {
      const testTime = createTestDate(0, 30);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(true);
    });

    it("should return true at 04:59 (before closing time)", () => {
      const testTime = createTestDate(4, 59);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(true);
    });

    it("should return false at 05:00 (closing time)", () => {
      const testTime = createTestDate(5, 0);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(false);
    });

    it("should return false at 10:00 (daytime)", () => {
      const testTime = createTestDate(10, 0);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(false);
    });

    it("should return false at 19:59 (before opening time)", () => {
      const testTime = createTestDate(19, 59);
      expect(isRestaurantOpenForTime(overnightShifts, testTime)).toBe(false);
    });
  });

  describe("Single Shift Format (20:00-05:00)", () => {
    const overnightSingleShift = JSON.stringify({
      sunday: { start: "20:00", end: "05:00" },
      monday: { start: "20:00", end: "05:00" },
      tuesday: { start: "20:00", end: "05:00" },
      wednesday: { start: "20:00", end: "05:00" },
      thursday: { start: "20:00", end: "05:00" },
      friday: { start: "20:00", end: "05:00" },
      saturday: { start: "20:00", end: "05:00" },
    });

    it("should return true at 20:00", () => {
      const testTime = createTestDate(20, 0);
      expect(isRestaurantOpenForTime(overnightSingleShift, testTime)).toBe(true);
    });

    it("should return true at 02:00", () => {
      const testTime = createTestDate(2, 0);
      expect(isRestaurantOpenForTime(overnightSingleShift, testTime)).toBe(true);
    });

    it("should return false at 05:00", () => {
      const testTime = createTestDate(5, 0);
      expect(isRestaurantOpenForTime(overnightSingleShift, testTime)).toBe(false);
    });

    it("should return false at 10:00", () => {
      const testTime = createTestDate(10, 0);
      expect(isRestaurantOpenForTime(overnightSingleShift, testTime)).toBe(false);
    });
  });

  describe("String Format (20:00-05:00)", () => {
    const overnightString = JSON.stringify({
      sunday: "20:00-05:00",
      monday: "20:00-05:00",
      tuesday: "20:00-05:00",
      wednesday: "20:00-05:00",
      thursday: "20:00-05:00",
      friday: "20:00-05:00",
      saturday: "20:00-05:00",
    });

    it("should return true at 20:00", () => {
      const testTime = createTestDate(20, 0);
      expect(isRestaurantOpenForTime(overnightString, testTime)).toBe(true);
    });

    it("should return true at 02:00", () => {
      const testTime = createTestDate(2, 0);
      expect(isRestaurantOpenForTime(overnightString, testTime)).toBe(true);
    });

    it("should return false at 05:00", () => {
      const testTime = createTestDate(5, 0);
      expect(isRestaurantOpenForTime(overnightString, testTime)).toBe(false);
    });

    it("should return false at 10:00", () => {
      const testTime = createTestDate(10, 0);
      expect(isRestaurantOpenForTime(overnightString, testTime)).toBe(false);
    });
  });

  describe("Normal Hours (10:00-22:00) - Backward Compatibility", () => {
    const normalHours = JSON.stringify({
      sunday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "22:00" },
        ],
      },
      monday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "22:00" },
        ],
      },
      tuesday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "22:00" },
        ],
      },
      wednesday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "22:00" },
        ],
      },
      thursday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "22:00" },
        ],
      },
      friday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "22:00" },
        ],
      },
      saturday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "22:00" },
        ],
      },
    });

    it("should return true at 10:00", () => {
      const testTime = createTestDate(10, 0);
      expect(isRestaurantOpenForTime(normalHours, testTime)).toBe(true);
    });

    it("should return true at 15:00", () => {
      const testTime = createTestDate(15, 0);
      expect(isRestaurantOpenForTime(normalHours, testTime)).toBe(true);
    });

    it("should return false at 22:00", () => {
      const testTime = createTestDate(22, 0);
      expect(isRestaurantOpenForTime(normalHours, testTime)).toBe(false);
    });

    it("should return false at 05:00", () => {
      const testTime = createTestDate(5, 0);
      expect(isRestaurantOpenForTime(normalHours, testTime)).toBe(false);
    });
  });

  describe("Multiple Shifts Including Overnight", () => {
    const multipleShifts = JSON.stringify({
      sunday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "14:00" },
          { start: "17:00", end: "21:00" },
          { start: "23:00", end: "05:00" },
        ],
      },
      monday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "14:00" },
          { start: "17:00", end: "21:00" },
          { start: "23:00", end: "05:00" },
        ],
      },
      tuesday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "14:00" },
          { start: "17:00", end: "21:00" },
          { start: "23:00", end: "05:00" },
        ],
      },
      wednesday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "14:00" },
          { start: "17:00", end: "21:00" },
          { start: "23:00", end: "05:00" },
        ],
      },
      thursday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "14:00" },
          { start: "17:00", end: "21:00" },
          { start: "23:00", end: "05:00" },
        ],
      },
      friday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "14:00" },
          { start: "17:00", end: "21:00" },
          { start: "23:00", end: "05:00" },
        ],
      },
      saturday: {
        closed: false,
        shifts: [
          { start: "10:00", end: "14:00" },
          { start: "17:00", end: "21:00" },
          { start: "23:00", end: "05:00" },
        ],
      },
    });

    it("should return true at 10:00 (first shift)", () => {
      const testTime = createTestDate(10, 0);
      expect(isRestaurantOpenForTime(multipleShifts, testTime)).toBe(true);
    });

    it("should return false at 15:00 (between shifts)", () => {
      const testTime = createTestDate(15, 0);
      expect(isRestaurantOpenForTime(multipleShifts, testTime)).toBe(false);
    });

    it("should return true at 17:00 (second shift)", () => {
      const testTime = createTestDate(17, 0);
      expect(isRestaurantOpenForTime(multipleShifts, testTime)).toBe(true);
    });

    it("should return true at 23:00 (third shift - overnight)", () => {
      const testTime = createTestDate(23, 0);
      expect(isRestaurantOpenForTime(multipleShifts, testTime)).toBe(true);
    });

    it("should return true at 02:00 (overnight shift after midnight)", () => {
      const testTime = createTestDate(2, 0);
      expect(isRestaurantOpenForTime(multipleShifts, testTime)).toBe(true);
    });

    it("should return false at 05:00 (after all shifts)", () => {
      const testTime = createTestDate(5, 0);
      expect(isRestaurantOpenForTime(multipleShifts, testTime)).toBe(false);
    });
  });
});
