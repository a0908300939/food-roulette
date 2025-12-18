import { describe, it, expect } from "vitest";

/**
 * 判斷店家是否營業中（使用台灣時間 UTC+8）
 */
function isRestaurantOpen(operatingHours: string, currentTime: Date): boolean {
  try {
    const hours = JSON.parse(operatingHours);
    // 使用台灣時間（UTC+8）確保與後台設定一致
    const taiwanTime = new Date(currentTime.getTime() + 8 * 60 * 60 * 1000);
    const taiwanDay = taiwanTime.getUTCDay();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][taiwanDay];
    const todayHours = hours[dayOfWeek];
    
    if (!todayHours || todayHours === '休息' || todayHours === 'closed') {
      return false;
    }
    
    // 支援新的 JSON 物件格式 {"closed": false, "shifts": [{"start": "10:00", "end": "14:00"}, ...]}
    if (typeof todayHours === 'object' && todayHours !== null) {
      // 檢查是否為公休
      if (todayHours.closed === true) {
        return false;
      }
      
      // 如果有 shifts 陣列，檢查任何班次是否營業中
      if (Array.isArray(todayHours.shifts)) {
        const currentHour = taiwanTime.getUTCHours();
        const currentMinute = taiwanTime.getUTCMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        
        for (const shift of todayHours.shifts) {
          const [startHour, startMinute] = shift.start.split(':').map(Number);
          const [endHour, endMinute] = shift.end.split(':').map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;
          
          // 處理跨午夜的情況 (例如 20:00-05:00)
          if (endTime <= startTime) {
            if (currentTimeInMinutes >= startTime || currentTimeInMinutes < endTime) {
              return true;
            }
          } else {
            if (currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime) {
              return true;
            }
          }
        }
        return false;
      }
      
      // 向後相容：支援舊的單班次格式 {"start": "00:00", "end": "23:59"}
      if (todayHours.start && todayHours.end) {
        const [openHour, openMinute] = todayHours.start.split(':').map(Number);
        const [closeHour, closeMinute] = todayHours.end.split(':').map(Number);
        
        const currentHour = taiwanTime.getUTCHours();
        const currentMinute = taiwanTime.getUTCMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const openingTime = openHour * 60 + openMinute;
        const closingTime = closeHour * 60 + closeMinute;
        
        // 處理跨午夜的情況 (例如 20:00-05:00)
        if (closingTime <= openingTime) {
          return currentTimeInMinutes >= openingTime || currentTimeInMinutes < closingTime;
        } else {
          return currentTimeInMinutes >= openingTime && currentTimeInMinutes < closingTime;
        }
      }
      
      // 如果是物件但沒有 shifts 或 start/end，則視為營業中
      return true;
    }
    
    // 支援舊的字串格式 "10:00-22:00"
    if (typeof todayHours === 'string') {
      const [openTime, closeTime] = todayHours.split('-');
      if (!openTime || !closeTime) {
        return false;
      }
      
      const [openHour, openMinute] = openTime.split(':').map(Number);
      const [closeHour, closeMinute] = closeTime.split(':').map(Number);
      
      const currentHour = taiwanTime.getUTCHours();
      const currentMinute = taiwanTime.getUTCMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const openingTime = openHour * 60 + openMinute;
      const closingTime = closeHour * 60 + closeMinute;
      
      // 處理跨午夜的情況 (例如 20:00-05:00)
      if (closingTime <= openingTime) {
        return currentTimeInMinutes >= openingTime || currentTimeInMinutes < closingTime;
      } else {
        return currentTimeInMinutes >= openingTime && currentTimeInMinutes < closingTime;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error parsing operating hours:', error);
    return true; // 如果解析失敗，預設為營業中
  }
}

describe("Operating Hours - Taiwan Time (UTC+8)", () => {
  // UTC 2025-01-16 02:09:51 = 台灣時間 2025-01-16 10:09:51 (Thursday)
  const thursdayUTCTime = new Date('2025-01-16T02:09:51Z');
  
  it("should show restaurant as open during operating hours (string format)", () => {
    const operatingHours = JSON.stringify({
      sunday: "10:00-22:00",
      monday: "10:00-22:00",
      tuesday: "10:00-22:00",
      wednesday: "10:00-22:00",
      thursday: "10:00-22:00",
      friday: "10:00-22:00",
      saturday: "10:00-22:00",
    });
    
    // 台灣時間 10:09:51 應該在 10:00-22:00 內
    expect(isRestaurantOpen(operatingHours, thursdayUTCTime)).toBe(true);
  });

  it("should show restaurant as closed outside operating hours", () => {
    const operatingHours = JSON.stringify({
      sunday: "11:00-14:00",
      monday: "11:00-14:00",
      tuesday: "11:00-14:00",
      wednesday: "11:00-14:00",
      thursday: "11:00-14:00",
      friday: "11:00-14:00",
      saturday: "11:00-14:00",
    });
    
    // 台灣時間 10:09:51 應該在 11:00-14:00 之外
    expect(isRestaurantOpen(operatingHours, thursdayUTCTime)).toBe(false);
  });

  it("should show restaurant as closed on closed day", () => {
    const operatingHours = JSON.stringify({
      sunday: "10:00-22:00",
      monday: "10:00-22:00",
      tuesday: "10:00-22:00",
      wednesday: "10:00-22:00",
      thursday: "closed",
      friday: "10:00-22:00",
      saturday: "10:00-22:00",
    });
    
    // 台灣時間是 Thursday，但 Thursday 設定為 closed
    expect(isRestaurantOpen(operatingHours, thursdayUTCTime)).toBe(false);
  });

  it("should support object format with shifts", () => {
    const operatingHours = JSON.stringify({
      sunday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      monday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      tuesday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      wednesday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      thursday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      friday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      saturday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
    });
    
    // 台灣時間 10:09:51 應該在第一個班次 10:00-14:00 內
    expect(isRestaurantOpen(operatingHours, thursdayUTCTime)).toBe(true);
  });

  it("should show restaurant as open in second shift", () => {
    const operatingHours = JSON.stringify({
      sunday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      monday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      tuesday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      wednesday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      thursday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      friday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
      saturday: { closed: false, shifts: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "22:00" }] },
    });
    
    // 台灣時間 18:30 的 UTC 時間 (18:30 - 8 = 10:30 UTC)
    const testTime2 = new Date('2025-01-16T10:30:00Z');
    
    // 台灣時間 18:30 應該在第二個班次 17:00-22:00 內
    expect(isRestaurantOpen(operatingHours, testTime2)).toBe(true);
  });

  it("should handle midnight crossing shifts (e.g., 20:00-05:00)", () => {
    const operatingHours = JSON.stringify({
      sunday: "20:00-05:00",
      monday: "20:00-05:00",
      tuesday: "20:00-05:00",
      wednesday: "20:00-05:00",
      thursday: "20:00-05:00",
      friday: "20:00-05:00",
      saturday: "20:00-05:00",
    });
    
    // 台灣時間 23:00 的 UTC 時間 (23:00 - 8 = 15:00 UTC)
    const testTime3 = new Date('2025-01-16T15:00:00Z');
    
    // 台灣時間 23:00 應該在 20:00-05:00 內
    expect(isRestaurantOpen(operatingHours, testTime3)).toBe(true);
    
    // 台灣時間 04:00 的 UTC 時間 (04:00 - 8 = 前一天 20:00 UTC)
    const testTime4 = new Date('2025-01-15T20:00:00Z');
    
    // 台灣時間 04:00 應該在 20:00-05:00 內
    expect(isRestaurantOpen(operatingHours, testTime4)).toBe(true);
  });

  it("should show restaurant as closed outside midnight crossing shift", () => {
    const operatingHours = JSON.stringify({
      sunday: "20:00-05:00",
      monday: "20:00-05:00",
      tuesday: "20:00-05:00",
      wednesday: "20:00-05:00",
      thursday: "20:00-05:00",
      friday: "20:00-05:00",
      saturday: "20:00-05:00",
    });
    
    // 台灣時間 10:09:51 應該不在 20:00-05:00 內
    expect(isRestaurantOpen(operatingHours, thursdayUTCTime)).toBe(false);
  });
});
