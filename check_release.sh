#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-https://world-breakout-j5t3flmxj-ak6666s-projects.vercel.app}"

say() { printf "\n\033[1;36m== %s ==\033[0m\n" "$*"; }
pass(){ printf "\033[1;32mPASS\033[0m %s\n" "$*"; }
fail(){ printf "\033[1;31mFAIL\033[0m %s\n" "$*"; exit 1; }

[ -f index.html ]     || fail "缺少 index.html"
[ -f js/breakout.js ] || fail "缺少 js/breakout.js（可能被 .gitignore 忽略）"

say "A. index.html 是否正确引用 js/breakout.js（允许?v=）"
grep -qE '<script[^>]+src=["'\'']js/breakout\.js(\?v=[0-9]+)?'\'']' index.html \
  && pass "本地 index.html 引用 OK" || fail "index.html 未正确引用 js/breakout.js"

say "B. .gitignore 是否屏蔽 js"
if [ -f .gitignore ] && grep -E '(^|/)(\*\.js|js/)(\s*$)' .gitignore >/dev/null; then
  fail ".gitignore 含 '*.js' 或 'js/' 规则，会导致 js/breakout.js 没被提交"
else
  pass ".gitignore 无阻挡规则"
fi

say "C. Git 跟踪状态"
git ls-files --error-unmatch js/breakout.js >/dev/null 2>&1 \
  && pass "js/breakout.js 已被 Git 跟踪" \
  || fail "js/breakout.js 没被 Git 跟踪（git add js/breakout.js && git commit）"

say "D. 线上 index.html 是否包含脚本引用"
curl -fsS "$BASE" | grep -Eo 'js/breakout\.js[^"]*' || true
curl -fsS "$BASE" | grep -q 'js/breakout\.js' \
  && pass "线上 index.html 已包含 js/breakout.js" \
  || fail "线上 index.html 未引用 js/breakout.js（部署产物旧？）"

say "E. 线上脚本是否可访问（带 cache-bust）"
TS=$(date +%s)
code_js=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/js/breakout.js?v=$TS")
[ "$code_js" = "200" ] && pass "线上 js/breakout.js 200 OK" || fail "线上 js/breakout.js 返回 $code_js"

say "F. 脚本内容抽查"
curl -fsS "$BASE/js/breakout.js?v=$TS" | head -n 20
curl -fsS "$BASE/js/breakout.js?v=$TS" | grep -qi 'Phaser' \
  && pass "脚本包含 Phaser/游戏关键字" \
  || fail "脚本不像是你的游戏代码"

say "G. 打开带全局 cache-bust 的首页"
echo "$BASE/?v=$TS"
pass "体检完成 ✅"
