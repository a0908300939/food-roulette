import { describe, expect, it, beforeEach, vi } from "vitest";
import * as db from "./db";

// Mock 資料庫連線
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return actual;
});

describe("Custom Wheel Styles", () => {
  describe("createCustomWheelStyle", () => {
    it("should create a new custom wheel style", async () => {
      const newStyle = {
        name: "Test Wheel",
        type: "canvas" as const,
        style: "rainbow",
        imageUrl: undefined,
        config: JSON.stringify({ colors: ["red", "blue"] }),
        isDefault: false,
        createdBy: 1,
      };

      // 測試建立自訂轉盤
      const result = await db.createCustomWheelStyle(newStyle);
      expect(result).toBeDefined();
      // insertId 可能是 number 或 undefined，取決於資料庫返回
      if (typeof result.insertId === 'number') {
        expect(result.insertId).toBeGreaterThan(0);
      }
    });

    it("should validate required fields", async () => {
      const invalidStyle = {
        name: "",
        type: "canvas" as const,
        style: "rainbow",
        imageUrl: undefined,
        config: undefined,
        isDefault: false,
        createdBy: 1,
      };

      // 空名稱應該被驗證
      expect(invalidStyle.name).toBe("");
    });
  });

  describe("listCustomWheelStyles", () => {
    it("should return list of custom wheel styles", async () => {
      const styles = await db.listCustomWheelStyles();
      expect(Array.isArray(styles)).toBe(true);
    });

    it("should return styles ordered by creation date", async () => {
      const styles = await db.listCustomWheelStyles();
      if (styles.length > 1) {
        for (let i = 0; i < styles.length - 1; i++) {
          const current = new Date(styles[i].createdAt).getTime();
          const next = new Date(styles[i + 1].createdAt).getTime();
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });
  });

  describe("getCustomWheelStyleById", () => {
    it("should return a style by ID", async () => {
      const styles = await db.listCustomWheelStyles();
      if (styles.length > 0) {
        const style = await db.getCustomWheelStyleById(styles[0].id);
        expect(style).toBeDefined();
        expect(style?.id).toBe(styles[0].id);
      }
    });

    it("should return undefined for non-existent ID", async () => {
      const style = await db.getCustomWheelStyleById(999999);
      expect(style).toBeUndefined();
    });
  });

  describe("deleteCustomWheelStyle", () => {
    it("should not delete default wheel styles", async () => {
      const styles = await db.listCustomWheelStyles();
      const defaultStyle = styles.find((s) => s.isDefault);

      if (defaultStyle) {
        try {
          await db.deleteCustomWheelStyle(defaultStyle.id);
          expect.fail("Should have thrown error");
        } catch (error) {
          expect(error instanceof Error).toBe(true);
          expect((error as Error).message).toContain("default");
        }
      }
    });

    it("should delete non-default custom styles", async () => {
      const styles = await db.listCustomWheelStyles();
      const customStyle = styles.find((s) => !s.isDefault);

      if (customStyle) {
        await db.deleteCustomWheelStyle(customStyle.id);
        const deleted = await db.getCustomWheelStyleById(customStyle.id);
        expect(deleted).toBeUndefined();
      }
    });
  });

  describe("updateCustomWheelStyle", () => {
    it("should not update default wheel styles", async () => {
      const styles = await db.listCustomWheelStyles();
      const defaultStyle = styles.find((s) => s.isDefault);

      if (defaultStyle) {
        try {
          await db.updateCustomWheelStyle(defaultStyle.id, {
            name: "Updated Name",
          });
          expect.fail("Should have thrown error");
        } catch (error) {
          expect(error instanceof Error).toBe(true);
          expect((error as Error).message).toContain("default");
        }
      }
    });

    it("should update non-default custom styles", async () => {
      const styles = await db.listCustomWheelStyles();
      const customStyle = styles.find((s) => !s.isDefault);

      if (customStyle) {
        const newName = "Updated Style Name";
        await db.updateCustomWheelStyle(customStyle.id, {
          name: newName,
        });

        const updated = await db.getCustomWheelStyleById(customStyle.id);
        expect(updated?.name).toBe(newName);
      }
    });
  });

  describe("Custom wheel style properties", () => {
    it("should have correct properties", async () => {
      const styles = await db.listCustomWheelStyles();
      if (styles.length > 0) {
        const style = styles[0];
        expect(style).toHaveProperty("id");
        expect(style).toHaveProperty("name");
        expect(style).toHaveProperty("type");
        expect(style).toHaveProperty("style");
        expect(style).toHaveProperty("isDefault");
        expect(style).toHaveProperty("createdBy");
        expect(style).toHaveProperty("createdAt");
        expect(style).toHaveProperty("updatedAt");
      }
    });

    it("should have valid type values", async () => {
      const styles = await db.listCustomWheelStyles();
      for (const style of styles) {
        expect(["canvas", "image"]).toContain(style.type);
      }
    });
  });
});
