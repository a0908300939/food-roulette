import axios from "axios";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { upsertUser } from "./db";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

interface LineTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/**
 * 取得 LINE Login 授權 URL
 */
export function getLineAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_CHANNEL_ID || "",
    redirect_uri: redirectUri,
    state: state,
    scope: "profile openid email",
  });
  
  return `${LINE_AUTH_URL}?${params.toString()}`;
}

/**
 * 使用授權碼交換 Access Token
 */
export async function getLineAccessToken(code: string, redirectUri: string): Promise<LineTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    client_id: process.env.LINE_CHANNEL_ID || "",
    client_secret: process.env.LINE_CHANNEL_SECRET || "",
  });

  const response = await axios.post<LineTokenResponse>(LINE_TOKEN_URL, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}

/**
 * 使用 Access Token 取得使用者資料
 */
export async function getLineProfile(accessToken: string): Promise<LineProfile> {
  const response = await axios.get<LineProfile>(LINE_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

/**
 * LINE Login tRPC 路由
 */
export const lineAuthRouter = router({
  /**
   * 取得 LINE Login 授權 URL
   */
  getAuthUrl: publicProcedure
    .input(z.object({
      redirectUri: z.string(),
      state: z.string().optional(),
    }))
    .query(({ input }) => {
      const state = input.state || Math.random().toString(36).substring(7);
      const authUrl = getLineAuthUrl(input.redirectUri, state);
      return { authUrl, state };
    }),

  /**
   * 處理 LINE Login 回調
   */
  callback: publicProcedure
    .input(z.object({
      code: z.string(),
      redirectUri: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // 1. 交換 Access Token
        const tokenResponse = await getLineAccessToken(input.code, input.redirectUri);
        
        // 2. 取得使用者資料
        const profile = await getLineProfile(tokenResponse.access_token);
        
        // 3. 建立或更新使用者
        await upsertUser({
          openId: `line_${profile.userId}`,
          name: profile.displayName,
          email: undefined, // LINE 的 email 需要額外審核
          loginMethod: "line",
          lastSignedIn: new Date(),
        });

        // 4. 簽發 Session Token
        const token = await sdk.createSessionToken(`line_${profile.userId}`, {
          name: profile.displayName,
          expiresInMs: ONE_YEAR_MS,
        });

        // 5. 設定 Cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: {
            openId: `line_${profile.userId}`,
            name: profile.displayName,
            loginMethod: "line",
          },
        };
      } catch (error: any) {
        console.error("LINE Login error:", error.response?.data || error.message);
        throw new Error("LINE 登入失敗，請稍後再試");
      }
    }),
});
