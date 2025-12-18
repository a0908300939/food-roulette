import { describe, expect, it } from "vitest";
import { getLineAuthUrl } from "./lineAuth";

describe("LINE Login Integration", () => {
  it("should generate valid LINE auth URL", () => {
    const redirectUri = "https://example.com/callback";
    const state = "test-state-123";
    
    const authUrl = getLineAuthUrl(redirectUri, state);
    
    // 驗證 URL 格式
    expect(authUrl).toContain("https://access.line.me/oauth2/v2.1/authorize");
    expect(authUrl).toContain("response_type=code");
    expect(authUrl).toContain(`client_id=${process.env.LINE_CHANNEL_ID}`);
    expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(authUrl).toContain(`state=${state}`);
    expect(authUrl).toContain("scope=profile+openid+email");
  });

  it("should have LINE_CHANNEL_ID environment variable set", () => {
    expect(process.env.LINE_CHANNEL_ID).toBeDefined();
    expect(process.env.LINE_CHANNEL_ID).not.toBe("");
  });

  it("should have LINE_CHANNEL_SECRET environment variable set", () => {
    expect(process.env.LINE_CHANNEL_SECRET).toBeDefined();
    expect(process.env.LINE_CHANNEL_SECRET).not.toBe("");
  });
});
