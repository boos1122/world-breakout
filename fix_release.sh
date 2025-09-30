#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

APP_ID="app_a6c354e707e8ac87f80c9d9af1a53053"
TS="$(date +%s)"

INDEX="index.html"
JS="js/breakout.js"

[ -f "$INDEX" ] || { echo "缺少 $INDEX"; exit 1; }
[ -f "$JS" ]    || { echo "缺少 $JS"; exit 1; }

echo "== 备份 =="
cp -f "$INDEX"       "$INDEX.bak.$TS"
cp -f "$JS"          "$JS.bak.$TS"      || true

echo "== 1) 强制标题为 Breakout =="
sed -i 's#<title>.*</title>#<title>Breakout</title>#' "$INDEX"

echo "== 2) viewport（没有就补上） =="
grep -q 'name="viewport"' "$INDEX" || \
  sed -i '0,/<head>/s#<head>#<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />#' "$INDEX"

echo "== 3) MiniKit（没有就补上） =="
grep -qi 'minikit-js' "$INDEX" || \
  sed -i '0,/<\/head>/s#</head>#  <script src="https://cdn.jsdelivr.net/npm/@worldcoin/minikit-js@latest/dist/index.umd.js"></script>\n</head>#' "$INDEX"

echo "== 4) 注入/更新 app_id = $APP_ID =="
# 有就替换
sed -i "s/app_id: *['\"][^'\"]*['\"]/app_id: '$APP_ID'/g" "$INDEX" "$JS" || true
sed -i "s/appId: *['\"][^'\"]*['\"]/appId: '$APP_ID'/g" "$INDEX" "$JS" || true
# 没有就插入到 head 末尾前
grep -q 'WorldApp.Client' "$INDEX" || \
  sed -i "/minikit-js@latest/a \  <script>window.WorldAppClient = new window.WorldApp.Client({ app_id: '$APP_ID' });</script>" "$INDEX"

echo "== 5) breakout.js 引用加 cache-bust ?v=TS =="
# 如果没引用则在 </body> 前插入
grep -q 'js/breakout\.js' "$INDEX" || \
  sed -i "s#</body>#  <script src=\"js/breakout.js?v=$TS\"></script>\n</body>#g" "$INDEX"
# 统一替换为带 v=TS
sed -i "s#js/breakout\.js[^\"]*#js/breakout.js?v=$TS#g" "$INDEX"

echo "== 6) i18n：中文 UI 文案 -> 英文 =="
sed -i \
  -e 's/打砖块游戏/Breakout/g' \
  -e 's/分数/Score/g' \
  -e 's/生命/Lives/g' \
  -e 's/关卡/Level/g' \
  -e 's/最高/Highscore/g' \
  -e 's/暂停/Paused/g' \
  -e 's/已暂停/Paused/g' \
  "$JS"

echo "== 7) 清理含中文的整行（多为注释） =="
# 删除包含中文字符的整行
sed -i '/[一-龥]/d' "$JS"

echo "== 8) 自检（本地静态检查） =="
echo "  · title 行：";  grep -n '<title>' "$INDEX" || true
echo "  · js 引用：";  grep -n 'breakout\.js' "$INDEX" || true
echo "  · app_id  ："; grep -n 'WorldApp.Client' "$INDEX" || true
echo "  · 中文检测："; grep -n '[一-龥]' "$JS" || echo "ok: $JS 已无中文"

echo "== 9) 提交并推送 =="
git add "$INDEX" "$JS" || true
git commit -m "release: enforce title Breakout, viewport+MiniKit, cache-bust js, inject app_id, i18n en & strip CN" || true
git push || true

URL="https://world-breakout-1759108604.netlify.app/?v=$TS"
echo "== 10) 打开去缓存链接 =="
echo "Open: $URL"

echo "== 11) 复检（如有脚本） =="
[ -x ./check_release.sh ] && ./check_release.sh "https://world-breakout-1759108604.netlify.app" || true

echo "完成。"
