/**
 * World MiniKit 对接（前端侧）
 * - 兼容模式：若 window.MiniKit 不存在，则用模拟器兜底，保证游戏不报错
 * - 暴露 window.worldAPI：login(), pay(), trackScore(score), getUser()
 */

(function () {
  const state = {
    appId: window.WORLD_APP_ID || 'YOUR_WORLD_APP_ID',
    user: null,
    ready: false,
    hasSDK: false,
  };

  function log(...args) { console.log('[world]', ...args); }

  async function init() {
    // 检测 SDK
    state.hasSDK = typeof window.MiniKit !== 'undefined';
    if (state.hasSDK) {
      try {
        window.__mini = new window.MiniKit({ appId: state.appId });
        state.ready = true;
        log('MiniKit ready');
      } catch (e) {
        log('MiniKit init failed', e);
      }
    } else {
      state.ready = true;
      log('MiniKit not found — fallback enabled');
    }
  }

  async function login() {
    if (!state.ready) await init();
    try {
      if (state.hasSDK) {
        state.user = await window.__mini.walletAuth();
      } else {
        // 模拟一个本地用户
        const uid = localStorage.getItem('world_uid') || ('local_' + Math.random().toString(36).slice(2));
        localStorage.setItem('world_uid', uid);
        state.user = { id: uid, name: 'Guest' };
      }
      log('login ok', state.user);
      return state.user;
    } catch (e) {
      log('login failed', e);
      throw e;
    }
  }

  async function pay({ amount = '1', currency = 'WORLD', description = 'Breakout purchase' } = {}) {
    if (!state.ready) await init();
    if (!state.user) await login();
    try {
      if (state.hasSDK) {
        const res = await window.__mini.payment({ amount, currency, description });
        log('pay ok', res);
        return res;
      } else {
        // 兜底：本地加积分
        const coins = Number(localStorage.getItem('coins') || '0') + Number(amount);
        localStorage.setItem('coins', String(coins));
        log('pay (fallback) +', amount);
        return { ok: true, fallback: true, amount };
      }
    } catch (e) {
      log('pay failed', e);
      throw e;
    }
  }

  async function trackScore(score) {
    // 这里通常是调用后端或 MiniKit 校验；先落本地
    const best = Number(localStorage.getItem('bestScore') || '0');
    if (score > best) localStorage.setItem('bestScore', String(score));
    log('trackScore', score);
  }

  function getUser() { return state.user; }

  window.worldAPI = { init, login, pay, trackScore, getUser };
})();
