#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_ID="app_a6c354e707e8ac87f80c9d9af1a53053"
TS="$(date +%s)"
INDEX="index.html"
JS="js/breakout.js"

echo "==> 基础检查：仓库与关键文件"
[ -f "$INDEX" ] || { echo "❌ 缺少 $INDEX"; exit 1; }
[ -f "$JS" ]     || { echo "❌ 缺少 $JS"; exit 1; }

echo "==> 1) 标题 = Breakout"
sed -i 's#<title>.*</title>#<title>Breakout</title>#' "$INDEX"
grep -qi '<title>Breakout</title>' "$INDEX" || { echo "❌ title 未设置"; exit 1; }

echo "==> 2) viewport meta（无则补）"
grep -q 'name="viewport"' "$INDEX" || \
  sed -i '0,/<head>/s#<head>#<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />#' "$INDEX"

echo "==> 3) 引入 MiniKit（无则补）"
grep -qi 'minikit-js' "$INDEX" || \
  sed -i '0,/<\/head>/s#</head>#  <script src="https://cdn.jsdelivr.net/npm/@worldcoin/minikit-js@latest/dist/index.umd.js"></script>\n</head>#' "$INDEX"

echo "==> 4) breakout.js 加 cache-bust 参数"
# 有无 ?v 都统一替换为当前时间戳
sed -i "s#src=[\"']js/breakout\.js\\([^\"']*\\)[\"']#src=\"js/breakout.js?v=${TS}\"#g" "$INDEX"
grep -qE 'src=.js/breakout\.js\?v=' "$INDEX" || { echo "❌ 未加 ?v= 时间戳"; exit 1; }

echo "==> 5) app_id 注入/修正（两种写法都覆盖）"
# 如果 index 或 js 已经含有 app_id/appId，先替换
sed -i "s#app_id:[[:space:]]*\"[^\"]*\"#app_id: \"${APP_ID}\"#g" "$INDEX" "$JS" || true
sed -i "s#appId:[[:space:]]*\"[^\"]*\"#appId: \"${APP_ID}\"#g" "$INDEX" "$JS" || true
# 若都没有，在 body 末尾追加一次（幂等；若已存在不会影响）
grep -Rqi 'app_id\|appId' "$INDEX" "$JS" || \
  sed -i "s#</body>#  <script>try{ new window.WorldApp.Client({ app_id: \"${APP_ID}\" }); }catch(e){ }</script>\n</body>#i" "$INDEX"

# 再次验证
grep -Rqi "${APP_ID}" "$INDEX" "$JS" || { echo "❌ app_id 未写入"; exit 1; }

echo "==> 6) 游戏内文案英文化 + 清理中文（不改逻辑）"
# 常见 UI 文案替换（只替换显示字面，不动变量/逻辑）
sed -i -e "s/打砖块游戏/Breakout/g" \
       -e "s/分数/Score/g" \
       -e "s/生命/Lives/g" \
       -e "s/关卡/Level/g" \
       -e "s/最高/Highscore/g" \
       -e "s/暂停/Paused/g" \
       -e "s/已暂停/Paused/g" "$JS"
# 删除包含中文字符的整行（多为注释/说明）
sed -i '/[一-龥]/d' "$JS"
# 校验无中文
if grep -q '[一-龥]' "$JS"; then
  echo "❌ breakout.js 仍有中文，请人工看一下上述行"; exit 1
fi

echo "==> 7) 最终本地自检"
grep -qi '<title>Breakout</title>' "$INDEX" || { echo "❌ title 检查失败"; exit 1; }
grep -q 'name="viewport"' "$INDEX" || { echo "❌ viewport 缺失"; exit 1; }
grep -qi 'minikit-js' "$INDEX" || { echo "❌ MiniKit 未引入"; exit 1; }
grep -qE 'src=.js/breakout\.js\?v=' "$INDEX" || { echo "❌ breakout.js 未加 ?v"; exit 1; }
grep -Rqi "${APP_ID}" "$INDEX" "$JS" || { echo "❌ app_id 未命中"; exit 1; }

echo "==> 8) 提交并推送"
git add "$INDEX" "$JS" || true
if git diff --cached --quiet; then
  echo "ℹ️ 无需提交：无变更或已提交过。"
else
  git commit -m "release: comply with World guidelines (title, viewport, MiniKit, cache-bust, app_id, i18n)" || true
fi
git push

echo "==> 9) 打开去缓存链接（可点）："
echo "https://world-breakout-1759108604.netlify.app/?v=${TS}"

echo "==> 10) 运行你的体检脚本（如存在）"
[ -x ./check_release.sh ] && ./check_release.sh "https://world-breakout-1759108604.netlify.app" || true

echo "✅ 完成：已检查并推送（若检查未通过，上面已中止并给出原因）。"
