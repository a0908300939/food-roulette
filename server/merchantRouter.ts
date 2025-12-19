import { Router, Request, Response } from "express";
import {
  getAllMerchants,
  getMerchantById,
  getMerchantByUserId,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  bindRestaurantToMerchant,
  unbindRestaurantFromMerchant,
  getRestaurantsByMerchantId,
  checkMerchantRestaurantAccess,
  getRestaurantStatistics,
  calculateAndUpdateRestaurantStatistics,
  getRestaurantRankings,
  getMerchantOverviewStatistics,
} from "./merchantDb";
import { getRestaurantById, updateRestaurant, getCouponsByRestaurantId } from "./db";
import { getUserByOpenId, upsertUser } from "./db";
import { InsertMerchant, InsertMerchantRestaurant } from "../drizzle/schema";

const router = Router();

// ========== 權限檢查中介軟體 ==========

/**
 * 檢查是否為管理員
 */
async function requireAdmin(req: Request, res: Response, next: Function) {
  const openId = req.headers["x-user-openid"] as string;
  
  if (!openId) {
    return res.status(401).json({ error: "Unauthorized: No user openid" });
  }
  
  const user = await getUserByOpenId(openId);
  
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  
  // 將使用者資訊附加到 request
  (req as any).user = user;
  next();
}

/**
 * 檢查是否為商家
 */
async function requireMerchant(req: Request, res: Response, next: Function) {
  const openId = req.headers["x-user-openid"] as string;
  
  if (!openId) {
    return res.status(401).json({ error: "Unauthorized: No user openid" });
  }
  
  const user = await getUserByOpenId(openId);
  
  if (!user || user.role !== "merchant") {
    return res.status(403).json({ error: "Forbidden: Merchant access required" });
  }
  
  // 取得商家資訊
  const merchant = await getMerchantByUserId(user.id);
  
  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }
  
  // 將使用者和商家資訊附加到 request
  (req as any).user = user;
  (req as any).merchant = merchant;
  next();
}

// ========== 管理員 API ==========

/**
 * 列出所有商家
 * GET /api/merchant-admin/merchants
 */
router.get("/merchant-admin/merchants", requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchants = await getAllMerchants();
    res.json(merchants);
  } catch (error) {
    console.error("[merchantRouter] Failed to get all merchants:", error);
    res.status(500).json({ error: "Failed to get merchants" });
  }
});

/**
 * 查看商家詳情
 * GET /api/merchant-admin/merchants/:id
 */
router.get("/merchant-admin/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const merchant = await getMerchantById(id);
    
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }
    
    // 取得商家管理的所有店鋪
    const restaurants = await getRestaurantsByMerchantId(id);
    
    res.json({
      ...merchant,
      restaurants,
    });
  } catch (error) {
    console.error("[merchantRouter] Failed to get merchant:", error);
    res.status(500).json({ error: "Failed to get merchant" });
  }
});

/**
 * 建立商家帳號
 * POST /api/merchant-admin/merchants
 * Body: { userId, name, contactPhone?, contactEmail?, status?, notes? }
 */
router.post("/merchant-admin/merchants", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, name, contactPhone, contactEmail, status, notes } = req.body;
    const adminUser = (req as any).user;
    
    if (!userId || !name) {
      return res.status(400).json({ error: "userId and name are required" });
    }
    
    // 檢查使用者是否存在
    const user = await getUserByOpenId(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // 檢查使用者是否已經是商家
    const existingMerchant = await getMerchantByUserId(user.id);
    if (existingMerchant) {
      return res.status(400).json({ error: "User is already a merchant" });
    }
    
    const merchantData: InsertMerchant = {
      userId: user.id,
      name,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      status: status || "active",
      notes: notes || null,
      createdBy: adminUser.id,
    };
    
    const merchantId = await createMerchant(merchantData);
    
    // 更新使用者角色為 merchant
    await upsertUser({
      openId: user.openId!,
      role: "merchant",
    });
    
    res.json({
      id: merchantId,
      ...merchantData,
    });
  } catch (error) {
    console.error("[merchantRouter] Failed to create merchant:", error);
    res.status(500).json({ error: "Failed to create merchant" });
  }
});

/**
 * 更新商家資訊
 * PUT /api/merchant-admin/merchants/:id
 * Body: { name?, contactPhone?, contactEmail?, status?, notes? }
 */
router.put("/merchant-admin/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, contactPhone, contactEmail, status, notes } = req.body;
    
    const merchant = await getMerchantById(id);
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }
    
    const updateData: Partial<InsertMerchant> = {};
    if (name !== undefined) updateData.name = name;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    await updateMerchant(id, updateData);
    
    res.json({ success: true });
  } catch (error) {
    console.error("[merchantRouter] Failed to update merchant:", error);
    res.status(500).json({ error: "Failed to update merchant" });
  }
});

/**
 * 刪除商家帳號
 * DELETE /api/merchant-admin/merchants/:id
 */
router.delete("/merchant-admin/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const merchant = await getMerchantById(id);
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }
    
    await deleteMerchant(id);
    
    // 更新使用者角色為 user
    await upsertUser({
      openId: (await getUserByOpenId(merchant.userId.toString()))?.openId!,
      role: "user",
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("[merchantRouter] Failed to delete merchant:", error);
    res.status(500).json({ error: "Failed to delete merchant" });
  }
});

/**
 * 綁定店鋪到商家
 * POST /api/merchant-admin/merchants/:id/restaurants
 * Body: { restaurantId }
 */
router.post("/merchant-admin/merchants/:id/restaurants", requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantId = parseInt(req.params.id);
    const { restaurantId } = req.body;
    const adminUser = (req as any).user;
    
    if (!restaurantId) {
      return res.status(400).json({ error: "restaurantId is required" });
    }
    
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }
    
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    
    const bindData: InsertMerchantRestaurant = {
      merchantId,
      restaurantId,
      boundBy: adminUser.id,
    };
    
    const bindId = await bindRestaurantToMerchant(bindData);
    
    res.json({
      id: bindId,
      ...bindData,
    });
  } catch (error: any) {
    console.error("[merchantRouter] Failed to bind restaurant:", error);
    if (error.message === "Restaurant already bound to this merchant") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to bind restaurant" });
  }
});

/**
 * 解除店鋪綁定
 * DELETE /api/merchant-admin/merchants/:id/restaurants/:restaurantId
 */
router.delete("/merchant-admin/merchants/:id/restaurants/:restaurantId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantId = parseInt(req.params.id);
    const restaurantId = parseInt(req.params.restaurantId);
    
    await unbindRestaurantFromMerchant(merchantId, restaurantId);
    
    res.json({ success: true });
  } catch (error) {
    console.error("[merchantRouter] Failed to unbind restaurant:", error);
    res.status(500).json({ error: "Failed to unbind restaurant" });
  }
});

// ========== 商家 API ==========

/**
 * 查看自己的商家資訊
 * GET /api/merchant/profile
 */
router.get("/merchant/profile", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    
    // 取得商家管理的所有店鋪
    const restaurants = await getRestaurantsByMerchantId(merchant.id);
    
    res.json({
      ...merchant,
      restaurants,
    });
  } catch (error) {
    console.error("[merchantRouter] Failed to get merchant profile:", error);
    res.status(500).json({ error: "Failed to get merchant profile" });
  }
});

/**
 * 更新自己的商家資訊
 * PUT /api/merchant/profile
 * Body: { name?, contactPhone?, contactEmail? }
 */
router.put("/merchant/profile", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const { name, contactPhone, contactEmail } = req.body;
    
    const updateData: Partial<InsertMerchant> = {};
    if (name !== undefined) updateData.name = name;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    
    await updateMerchant(merchant.id, updateData);
    
    res.json({ success: true });
  } catch (error) {
    console.error("[merchantRouter] Failed to update merchant profile:", error);
    res.status(500).json({ error: "Failed to update merchant profile" });
  }
});

/**
 * 取得自己管理的所有店鋪
 * GET /api/merchant/restaurants
 */
router.get("/merchant/restaurants", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const restaurants = await getRestaurantsByMerchantId(merchant.id);
    
    res.json(restaurants);
  } catch (error) {
    console.error("[merchantRouter] Failed to get merchant restaurants:", error);
    res.status(500).json({ error: "Failed to get merchant restaurants" });
  }
});

/**
 * 查看店鋪詳情（權限檢查）
 * GET /api/merchant/restaurants/:id
 */
router.get("/merchant/restaurants/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const restaurantId = parseInt(req.params.id);
    
    // 檢查權限
    const hasAccess = await checkMerchantRestaurantAccess(merchant.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Forbidden: You don't have access to this restaurant" });
    }
    
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    
    // 取得店鋪的所有優惠券
    const coupons = await getCouponsByRestaurantId(restaurantId);
    
    res.json({
      ...restaurant,
      coupons,
    });
  } catch (error) {
    console.error("[merchantRouter] Failed to get restaurant:", error);
    res.status(500).json({ error: "Failed to get restaurant" });
  }
});

/**
 * 更新店鋪資訊（不含機率）
 * PUT /api/merchant/restaurants/:id
 * Body: { name?, address?, phone?, description?, photoUrl?, operatingHours?, providesCheckInReward?, isActive? }
 */
router.put("/merchant/restaurants/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const restaurantId = parseInt(req.params.id);
    
    // 檢查權限
    const hasAccess = await checkMerchantRestaurantAccess(merchant.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Forbidden: You don't have access to this restaurant" });
    }
    
    const { name, address, phone, description, photoUrl, operatingHours, providesCheckInReward, isActive } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (description !== undefined) updateData.description = description;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (operatingHours !== undefined) updateData.operatingHours = operatingHours;
    if (providesCheckInReward !== undefined) updateData.providesCheckInReward = providesCheckInReward;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    await updateRestaurant(restaurantId, updateData);
    
    res.json({ success: true });
  } catch (error) {
    console.error("[merchantRouter] Failed to update restaurant:", error);
    res.status(500).json({ error: "Failed to update restaurant" });
  }
});

/**
 * 查看店鋪統計資料
 * GET /api/merchant/restaurants/:id/statistics
 * Query: startDate, endDate
 */
router.get("/merchant/restaurants/:id/statistics", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const restaurantId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;
    
    // 檢查權限
    const hasAccess = await checkMerchantRestaurantAccess(merchant.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Forbidden: You don't have access to this restaurant" });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    
    const statistics = await getRestaurantStatistics(restaurantId, startDate as string, endDate as string);
    
    res.json(statistics);
  } catch (error) {
    console.error("[merchantRouter] Failed to get restaurant statistics:", error);
    res.status(500).json({ error: "Failed to get restaurant statistics" });
  }
});

/**
 * 查看所有店鋪總覽統計
 * GET /api/merchant/overview-statistics
 * Query: startDate, endDate
 */
router.get("/merchant/overview-statistics", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    
    const statistics = await getMerchantOverviewStatistics(merchant.id, startDate as string, endDate as string);
    
    res.json(statistics);
  } catch (error) {
    console.error("[merchantRouter] Failed to get overview statistics:", error);
    res.status(500).json({ error: "Failed to get overview statistics" });
  }
});

/**
 * 查看排名資料
 * GET /api/merchant/rankings
 * Query: startDate, endDate
 */
router.get("/merchant/rankings", requireMerchant, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    
    const rankings = await getRestaurantRankings(startDate as string, endDate as string);
    
    res.json(rankings);
  } catch (error) {
    console.error("[merchantRouter] Failed to get rankings:", error);
    res.status(500).json({ error: "Failed to get rankings" });
  }
});

/**
 * 計算並更新店鋪統計資料（手動觸發）
 * POST /api/merchant/restaurants/:id/calculate-statistics
 * Body: { date }
 */
router.post("/merchant/restaurants/:id/calculate-statistics", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const restaurantId = parseInt(req.params.id);
    const { date } = req.body;
    
    // 檢查權限
    const hasAccess = await checkMerchantRestaurantAccess(merchant.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Forbidden: You don't have access to this restaurant" });
    }
    
    if (!date) {
      return res.status(400).json({ error: "date is required (format: YYYY-MM-DD)" });
    }
    
    await calculateAndUpdateRestaurantStatistics(restaurantId, date);
    
    res.json({ success: true });
  } catch (error) {
    console.error("[merchantRouter] Failed to calculate statistics:", error);
    res.status(500).json({ error: "Failed to calculate statistics" });
  }
});

export default router;
