(function () {
  const api = (window.worldAPI || window.world || window.MiniKit || {}).default || window.worldAPI || window.world;

  function ok(x){ return typeof x !== 'undefined' && x !== null; }
  function toast(msg){ try{ alert(msg); }catch(e){} }

  // 登录
  window.worldLogin = async function () {
    if (!ok(api) || !api.login) return toast('MiniKit 未加载或不支持登录');
    try {
      await api.login();
      toast('登录成功');
    } catch (e) {
      console.error(e);
      toast('登录失败');
    }
  };

  // 支付 1 WORLD（可改为积分/道具等）
  window.worldBuy = async function () {
    if (!ok(api) || !api.pay) return toast('MiniKit 未加载或不支持支付');
    try {
      await api.pay({
        amount: '1',
        currency: 'WORLD',
        description: 'Breakout 内购'
      });
      toast('支付成功（或本地加积分）');
    } catch (e) {
      console.error(e);
      toast('支付失败');
    }
  };

  // 记分：供游戏里调用（你之前已加了 hook；这里做兜底）
  window.worldTrackScore = function (score) {
    if (!ok(api) || !api.trackScore) return;
    try { api.trackScore(Number(score)||0); } catch(e){ console.warn(e); }
  };
})();
