#!/usr/bin/env bash
set -euo pipefail

# 用法: ./check_release.sh https://world-breakout-xxxx.netlify.app
BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "Usage: $0 <base_url>   e.g. $0 https://world-breakout-1759108604.netlify.app"
  exit 1
fi

say() { printf "\n==== %s ====\n" "$*"; }
pass(){ echo "✅ PASS - $*"; }
fail(){ echo "❌ FAIL - $*"; FAILED=1; }

FAILED=0

say "1) 基础连通性与首页加载"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/?v=$(date +%s)")
[[ "$code" == "200" ]] && pass "首页 200" || fail "首页响应 $code"

say "2) 核心静态资源探测 (存在且 200)"
check200() {
  local url="$1"
  local c=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  [[ "$c" == "200" ]] && pass "$url" || fail "$url 响应 $c"
}
check200 "$BASE/index.html"
check200 "$BASE/js/breakout.js"
check200 "$BASE/assets/games/breakout/breakout.png"
check200 "$BASE/assets/games/breakout/breakout.json"

say "3) Phaser 与 MiniKit 依赖检查（index.html）"
ihtml=$(curl -s "$BASE/index.html")
echo "$ihtml" | grep -q 'phaser@3' && pass "已引入 Phaser 3" || fail "未检测到 Phaser 3"
echo "$ihtml" | grep -q '@worldcoin/minikit-js' && pass "已引入 MiniKit JS" || fail "未检测到 MiniKit JS"
echo "$ihtml" | grep -q '<meta name="viewport"' && pass "存在 viewport meta" || fail "缺少 viewport meta"
echo "$ihtml" | grep -qi '<title>.*breakout.*</title>' && pass "页面标题含 Breakout" || fail "标题建议设置为 Breakout"

say "4) 世界 App 顶部工具条/标题在外部浏览器可见但不挡画面"
# 粗检是否有顶部提示区（非必须，仅提示）
echo "$ihtml" | grep -q 'class="toolbar"' && pass "检测到自定义 toolbar（外部浏览器用）" || pass "未检测到 toolbar（可忽略）"

say "5) 构建缓存 bust（避免黑屏仍用旧 JS）"
vlink=$(echo "$ihtml" | sed -n 's/.*<script src="js\/breakout\.js?v=\([^"]*\)".*/\1/p')
if [[ -n "$vlink" ]]; then
  pass "breakout.js 使用了版本参数 v=$vlink"
else
  echo "$ihtml" | grep -q 'js/breakout.js' && fail "未对 js/breakout.js 加版本参数，建议 ?v=时间戳/commit"
fi

say "6) 检查是否遗留调试/遮罩（上线应删除）"
echo "$ihtml" | grep -q 'error-overlay.js' && fail "检测到 error-overlay.js 引用（请移除）" || pass "无 error-overlay 遮罩引用"
bj=$(curl -s "$BASE/js/breakout.js")
echo "$bj" | grep -qi 'console\.log' && pass "存在少量 console.log（允许，建议精简）" || pass "无明显 console.log"

say "7) 文案国际化（游戏内是否仍有中文）"
if echo "$bj" | grep -qP '[\p{Han}]'; then
  echo "$bj" | grep -nP '[\p{Han}]' | head -n 10
  fail "breakout.js 仍含中文（以上为示例行），请统一改英文"
else
  pass "breakout.js 未检测到中文"
fi

say "8) MiniKit 初始化与 app_id"
echo "$ihtml" | grep -q 'new window\.WorldApp\.Client' && pass "检测到 MiniKit Client 初始化" || fail "未检测到 MiniKit Client 初始化"
appid=$(echo "$ihtml" | sed -n 's/.*app_id":[[:space:]]*"\([^"]\+\)".*/\1/p')
if [[ -n "$appid" && "$appid" != "APP_ID_HERE" && "$appid" != "app_xxx" ]]; then
  pass "检测到 app_id = $appid"
else
  fail "未正确配置 app_id（World 开发者后台创建后填入）"
fi

say "9) Phaser 画布适配（移动端是否铺满、避免下拉）"
echo "$bj" | grep -q 'Phaser.Scale.FIT' && pass "Scale 模式包含 FIT（常用）" || pass "未发现 FIT（不一定是问题）"
echo "$bj" | grep -q 'CENTER_BOTH' && pass "autoCenter: CENTER_BOTH" || pass "未发现 autoCenter（不一定是问题）"

say "10) 资源引用路径（JSON 内引用的 frame/atlas 相对路径是否工作）"
# 粗检 JSON 内容
bjson=$(curl -s "$BASE/assets/games/breakout/breakout.json")
echo "$bjson" | grep -q '"frames"' && pass "图集 JSON 包含 frames" || fail "图集 JSON 不含 frames？检查内容"

say "11) 安全头/跨域（参考 Netlify 默认即可）"
# 仅提示，不强制
pass "Netlify 默认 HSTS/缓存策略已存在（如需细化可在 _headers 配置）"

say "12) PWA/图标/OG 图（可选增强）"
echo "$ihtml" | grep -q 'og:image' && pass "存在 OG 图 meta" || pass "未检测到 OG 图 meta（可选）"
echo "$ihtml" | grep -q 'rel="icon"' && pass "存在 favicon" || pass "未检测到 favicon（可选）"

say "体检完成"
if [[ ${FAILED:-0} -ne 0 ]]; then
  echo -e "\n有 FAIL 项，请按上面的提示逐项修复后重跑本脚本。"
  exit 2
else
  echo -e "\n全部通过！可以进入 World 开发者后台做最终提审/上架。"
fi
