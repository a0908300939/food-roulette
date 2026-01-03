/**
 * 用餐時段定義
 */
export type MealPeriod = "breakfast" | "lunch" | "afternoon_tea" | "dinner" | "late_night";

export interface TimeRange {
  start: string; // HH:MM 格式
  end: string;   // HH:MM 格式
}

export interface MealPeriodConfig {
  id: MealPeriod;
  name: string;
  timeRange: TimeRange;
  icon: string;
}

/**
 * 所有用餐時段的配置
 */
export const MEAL_PERIODS: MealPeriodConfig[] = [
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
    timeRange: { start: "20:00", end: "05:00" },
    icon: "🌙",
  },
];

/**
 * 將時間字串 (HH:MM) 轉換為分鐘數
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * 檢查當前時間是否在指定的時間範圍內
 */
export function isTimeInRange(currentTime: Date, range: TimeRange): boolean {
  // 使用台灣時間（UTC+8）
  // 直接從 UTC 時間加上 8 小時的毫秒數
  const utcTime = currentTime.getTime();
  const taiwanTimeMs = utcTime + 8 * 60 * 60 * 1000;
  
  // 計算台灣時間的小時和分鐘
  const taiwanHours = Math.floor((taiwanTimeMs / (60 * 60 * 1000)) % 24);
  const taiwanMinutes = Math.floor((taiwanTimeMs / (60 * 1000)) % 60);
  const currentMinutes = taiwanHours * 60 + taiwanMinutes;

  const startMinutes = timeToMinutes(range.start);
  const endMinutes = timeToMinutes(range.end);

  // 處理跨午夜的情況 (例如 20:00-05:00)
  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * 根據當前時間獲取對應的用餐時段
 * @returns 當前時間所屬的所有用餐時段（可能有重疊）
 */
export function getCurrentMealPeriods(currentTime: Date = new Date()): MealPeriodConfig[] {
  return MEAL_PERIODS.filter((period) => isTimeInRange(currentTime, period.timeRange));
}

/**
 * 根據當前時間獲取主要用餐時段（如果有多個，返回第一個）
 */
export function getPrimaryMealPeriod(currentTime: Date = new Date()): MealPeriodConfig | null {
  const periods = getCurrentMealPeriods(currentTime);
  return periods.length > 0 ? periods[0] : null;
}

/**
 * 檢查店家當前是否營業中（檢查當前時間是否在營業時間內）
 * @param operatingHours 店家營業時間 JSON 字串
 * @param mealPeriod 用餐時段（用於篩選，但不影響營業判斷）
 * @param currentTime 當前時間
 */
export function isRestaurantOpenForPeriod(
  operatingHours: string,
  mealPeriod: MealPeriodConfig,
  currentTime: Date = new Date()
): boolean {
  try {
    const hours = JSON.parse(operatingHours);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    
    // 使用 toLocaleString 取得台灣時間，更可靠
    const taiwanTimeStr = currentTime.toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
    const taiwanDate = new Date(taiwanTimeStr);
    
    const taiwanHour = taiwanDate.getHours();
    const taiwanMinute = taiwanDate.getMinutes();
    const taiwanDay = taiwanDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    const currentDay = dayNames[taiwanDay];
    
    const todayHours = hours[currentDay];
    if (!todayHours || todayHours === "closed") {
      return false;
    }

    // 獲取當前時間（分鐘數）
    const currentMinutes = taiwanHour * 60 + taiwanMinute;

    // 支援新的兩班制格式 {"closed":false,"shifts":[{"start":"10:00","end":"14:00"},{"start":"17:00","end":"21:00"}]}
    // 或舊的單班次格式 {"start":"00:00","end":"23:59"}
    if (typeof todayHours === 'object' && todayHours !== null) {
      // 檢查是否為公休
      if (todayHours.closed === true) {
        return false;
      }

      // 如果有 shifts 陣列，檢查每個班次
      if (Array.isArray(todayHours.shifts)) {
        for (const shift of todayHours.shifts) {
          const storeStart = timeToMinutes(shift.start);
          const storeEnd = timeToMinutes(shift.end);

          // 處理跨午夜的情況 (例如 20:00-05:00)
          if (storeEnd <= storeStart) {
            if (currentMinutes >= storeStart || currentMinutes < storeEnd) {
              return true;
            }
          } else {
            if (currentMinutes >= storeStart && currentMinutes < storeEnd) {
              return true;
            }
          }
        }
        return false;
      }

      // 向後相容：支援舊的單班次格式 {"start":"00:00","end":"23:59"}
      if (todayHours.start && todayHours.end) {
        const storeStart = timeToMinutes(todayHours.start);
        const storeEnd = timeToMinutes(todayHours.end);

        // 處理跨午夜的情況 (例如 20:00-05:00)
        if (storeEnd <= storeStart) {
          return currentMinutes >= storeStart || currentMinutes < storeEnd;
        } else {
          return currentMinutes >= storeStart && currentMinutes < storeEnd;
        }
      }

      // 如果是物件但沒有 shifts 或 start/end，則視為營業中
      return true;
    }

    // 支援舊的字串格式 "10:00-22:00" 或 "10:00-14:00,17:00-22:00"
    if (typeof todayHours === 'string') {
      const timeSlots = todayHours.split(",").map((slot: string) => slot.trim());
      
      for (const slot of timeSlots) {
        const [start, end] = slot.split("-").map((t: string) => t.trim());
        if (!start || !end) continue;

        const storeStart = timeToMinutes(start);
        const storeEnd = timeToMinutes(end);

        // 處理跨午夜的情況 (例如 20:00-05:00)
        if (storeEnd <= storeStart) {
          if (currentMinutes >= storeStart || currentMinutes < storeEnd) {
            return true;
          }
        } else {
          if (currentMinutes >= storeStart && currentMinutes < storeEnd) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error parsing operating hours:", error, "Data:", operatingHours);
    return false;
  }
}

/**
 * 篩選出在指定時段營業的店家
 */
export function filterRestaurantsByPeriod<T extends { operatingHours: string; isActive: boolean }>(
  restaurants: T[],
  mealPeriod: MealPeriodConfig,
  currentTime: Date = new Date()
): T[] {
  return restaurants.filter(
    (restaurant) =>
      restaurant.isActive &&
      isRestaurantOpenForPeriod(restaurant.operatingHours, mealPeriod, currentTime)
  );
}

/**
 * 篩選出當前營業的店家（不受用餐時段限制，直接根據店家營業時間）
 */
export function filterOpenRestaurants<T extends { operatingHours: string; isActive: boolean }>(
  restaurants: T[],
  currentTime: Date = new Date()
): T[] {
  try {
    // 使用 toLocaleString 取得台灣時間，更可靠
    const taiwanTimeStr = currentTime.toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
    const taiwanDate = new Date(taiwanTimeStr);
    
    const taiwanHour = taiwanDate.getHours();
    const taiwanMinute = taiwanDate.getMinutes();
    const taiwanDay = taiwanDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    const currentMinutes = taiwanHour * 60 + taiwanMinute;
    
    console.log('[filterOpenRestaurants] 台灣時間:', taiwanHour + ':' + taiwanMinute, '星期:', taiwanDay);
    
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDay = dayNames[taiwanDay];
    
    return restaurants.filter((restaurant) => {
      if (!restaurant.isActive) {
        console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ 未啟用');
        return false;
      }
      
      try {
        const hours = JSON.parse(restaurant.operatingHours);
        const todayHours = hours[currentDay];
        
        console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ currentDay:', currentDay, 'todayHours:', JSON.stringify(todayHours));
        
        if (!todayHours || todayHours === "closed") {
          console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ 無營業時間或公休');
          return false;
        }
        
        // 檢查是否為公休
        if (typeof todayHours === 'object' && todayHours !== null && todayHours.closed === true) {
          console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ 公休 (closed=true)');
          return false;
        }
        
        // 如果有 shifts 陣列，檢查每個班次
        if (typeof todayHours === 'object' && Array.isArray(todayHours.shifts)) {
          console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ 檢查 shifts:', JSON.stringify(todayHours.shifts), 'currentMinutes:', currentMinutes);
          for (const shift of todayHours.shifts) {
            const storeStart = timeToMinutes(shift.start);
            const storeEnd = timeToMinutes(shift.end);
            console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ shift:', shift.start, '-', shift.end, 'storeStart:', storeStart, 'storeEnd:', storeEnd);
            
            // 處理跨午夜的情況
            if (storeEnd <= storeStart) {
              if (currentMinutes >= storeStart || currentMinutes < storeEnd) {
                console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ ✅ 營業中 (跨午夜)');
                return true;
              }
            } else {
              if (currentMinutes >= storeStart && currentMinutes < storeEnd) {
                console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ ✅ 營業中');
                return true;
              }
            }
          }
          console.log('[filterOpenRestaurants]', restaurant.name || 'unknown', '→ ❌ 不在營業時間內');
          return false;
        }
        
        // 支援舊的單班次格式
        if (typeof todayHours === 'object' && todayHours.start && todayHours.end) {
          const storeStart = timeToMinutes(todayHours.start);
          const storeEnd = timeToMinutes(todayHours.end);
          
          if (storeEnd <= storeStart) {
            return currentMinutes >= storeStart || currentMinutes < storeEnd;
          } else {
            return currentMinutes >= storeStart && currentMinutes < storeEnd;
          }
        }
        
        // 支援舊的字串格式
        if (typeof todayHours === 'string') {
          const timeSlots = todayHours.split(",").map((slot: string) => slot.trim());
          
          for (const slot of timeSlots) {
            const [start, end] = slot.split("-").map((t: string) => t.trim());
            if (!start || !end) continue;
            
            const storeStart = timeToMinutes(start);
            const storeEnd = timeToMinutes(end);
            
            if (storeEnd <= storeStart) {
              if (currentMinutes >= storeStart || currentMinutes < storeEnd) {
                return true;
              }
            } else {
              if (currentMinutes >= storeStart && currentMinutes < storeEnd) {
                return true;
              }
            }
          }
        }
        
        // 如果是物件但沒有 shifts 或 start/end，則視為營業中
        if (typeof todayHours === 'object' && todayHours !== null) {
          return true;
        }
        
        return false;
      } catch (error) {
        console.error("Error parsing operating hours:", error);
        return false;
      }
    });
  } catch (error) {
    console.error("Error filtering open restaurants:", error);
    return [];
  }
}
