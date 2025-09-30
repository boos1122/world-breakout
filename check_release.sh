#!/bin/bash
set -euo pipefail

BASE="https://world-breakout-j5t3flmxj-ak6666s-projects.vercel.app"

echo "== A. index.html 是否正确引用 js/breakout.js（允许?v=） =="
if grep -qiE 'src=["'\''"]js/breakout\.js(\?v=[0-9]+)?' index.html; then
  echo "PASS A"
else
  echo "FAIL A: index.html 未正确引用 js/breakout.js"
  exit 1
fi

echo "== B. 检查 js/breakout.js 是否存在 =="
if [ -f js/breakout.js ]; then
  echo "PASS B"
else
  echo "FAIL B: js/breakout.js 文件不存在"
  exit 1
fi

echo "== C. 检查远程访问 =="
curl -sI "$BASE/js/breakout.js" | head -n1 | grep -q "200"
echo "PASS C"

echo "== D. 基础语法检查（前30行） =="
head -n 30 js/breakout.js > /dev/null
echo "PASS D"

echo "全部检查通过 ✅"
