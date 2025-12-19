#!/bin/bash

# 使用 curl 調用 Railway 上的應用程式 API 來更新用戶權限
curl -X POST https://food-roulette-production.up.railway.app/api/trpc/admin.upgradeUserToAdmin \
  -H "Content-Type: application/json" \
  -d '{"email":"a0923188353@gmail.com"}'
