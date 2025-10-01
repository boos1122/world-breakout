#!/usr/bin/env bash
set -euo pipefail

green(){ printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }
red(){ printf "\033[31m%s\033[0m\n" "$*"; }

APP_ID="app_a6c354e707e8ac87f80c9d9af1a53053"   # 你的 World App ID（可改）

echo "========== Vercel =========="
if command -v vercel >/dev/null 2>&1; then
  vercel whoami || true
  echo "-- Projects --"
  vercel projects list 2>/dev/null | sed -n '1,80p' || true

  echo "-- world-breakout 部署列表 --"
  (vercel ls world-breakout 2>/dev/null || vercel list world-breakout 2>/dev/null || true) | sed -n '1,80p'

  echo "-- 最新 production 部署 URL --"
  PROD_URL="$(vercel ls world-breakout --prod --confirm 2>/dev/null | awk '/https:\/\/.*\.vercel\.app/{print $1; exit}')"
  [ -n "${PROD_URL:-}" ] && green "Vercel PROD: $PROD_URL" || yellow "未找到 world-breakout 的 production URL"

  echo "-- 环境变量 (env) --"
  vercel env ls world-breakout 2>/dev/null || true
else
  yellow "未检测到 vercel CLI（可选：pkg install nodejs && npm i -g vercel）"
fi
echo

echo "========== Netlify =========="
if command -v netlify >/dev/null 2>&1; then
  netlify status || true
  echo "-- Sites 列表 --"
  netlify sites:list || true

  # 取第一个站点的最近部署（只是展示，真实站点请对照名字）
  SITE_ID="$(netlify sites:list --json 2>/dev/null | sed -n 's/.*"id":"\([^"]\+\)".*/\1/p' | head -n1)"
  if [ -n "$SITE_ID" ]; then
    echo "-- Recent deploys (first site) --"
    netlify deploy:list --site "$SITE_ID" | sed -n '1,60p' || true
  fi
else
  yellow "未检测到 netlify-cli（可选：npm i -g netlify-cli）"
fi
echo

echo "========== 在线可用性检测 =========="
CANDIDATES=()
# 你已有的已知域名，按需补充
CANDIDATES+=("https://world-breakout-1759108604.netlify.app")
# 从 vercel 自动抓取 production URL（如果有）
if [ -n "${PROD_URL:-}" ]; then CANDIDATES+=("$PROD_URL"); fi

for u in "${CANDIDATES[@]}"; do
  [ -z "$u" ] && continue
  code="$(curl -s -o /dev/null -w '%{http_code}' "$u")"
  echo "$code  $u"
done
echo

echo "========== MiniKit / app_id 检查 =========="
for u in "${CANDIDATES[@]}"; do
  [ -z "$u" ] && continue
  echo "-- 检查：$u --"
  # 首页是否含 MiniKit
  if curl -s "$u/index.html" | grep -qi 'minikit-js'; then
    green "✓ 已引入 MiniKit JS"
  else
    yellow "✗ 未发现 MiniKit JS script 标签"
  fi
  # 首页是否设置了 app_id
  if curl -s "$u/index.html" | grep -qE "app_id[: ]+\"?$APP_ID\"?"; then
    green "✓ index.html 中找到了 app_id=$APP_ID"
  else
    yellow "✗ index.html 未匹配到 app_id=$APP_ID（可能写在 js 或没部署最新）"
  fi
  # JS 是否仍含中文（用于通过官方检查）
  if curl -s "$u/js/breakout.js" | grep -qP '[\x{4e00}-\x{9fa5}]'; then
    yellow "✗ breakout.js 含中文（需英文化）"
  else
    green "✓ breakout.js 无中文"
  fi
  echo
done

echo "========== 结论建议 =========="
if [ -n "${PROD_URL:-}" ]; then
  green "Vercel production URL：$PROD_URL"
else
  yellow "Vercel 未发现 production URL，请到 dashboard 确认。"
fi
green "Netlify Dashboard: https://app.netlify.com/"
green "Vercel Dashboard : https://vercel.com/dashboard"
echo "在官方后台填写回调域名/应用域名时，使用上方『可用性检测』中返回 200 且已包含 app_id 的那个域名。"
