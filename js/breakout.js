// Phaser 3 Breakout — 进阶版：进度存储 / 暂停 / 难度递增 / 鼠标滚轮灵敏度
class Save {
  static KEY = 'breakout.save.v1';
  static load() {
    try {
      const raw = localStorage.getItem(Save.KEY);
      if (!raw) return { level: 1, highScore: 0, sensitivity: 1.0 };
      const obj = JSON.parse(raw);
      return {
        level: Math.max(1, obj.level || 1),
        highScore: obj.highScore || 0,
        sensitivity: Math.min(2, Math.max(0.5, obj.sensitivity ?? 1.0)),
      };
    } catch { return { level: 1, highScore: 0, sensitivity: 1.0 }; }
  }
  static write(data) {
    localStorage.setItem(Save.KEY, JSON.stringify(data));
  }
}

function makeRoundedTex(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 1);
  g.fillRoundedRect(0, 0, w, h, Math.min(w, h) * 0.25);
  g.generateTexture(key, w, h);
  g.destroy();
}

class Breakout extends Phaser.Scene {
  constructor() {
    super('Breakout');
    this.bricks = null;
    this.paddle = null;
    this.ball = null;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.highScore = 0;
    this.paddleSpeedFactor = 1.0; // 可被滚轮调整 0.5 ~ 2.0
    this.ui = {};
  }

  preload() {
    // 运行时生成贴图（方块、挡板、球）
    makeRoundedTex(this, 'brick-blue', 64, 24, 0x66ccff);
    makeRoundedTex(this, 'brick-red', 64, 24, 0xff6b6b);
    makeRoundedTex(this, 'brick-green', 64, 24, 0x9ae66e);
    makeRoundedTex(this, 'brick-yellow', 64, 24, 0xffdf6b);
    makeRoundedTex(this, 'brick-gray', 64, 24, 0xdedede);
    makeRoundedTex(this, 'brick-purple', 64, 24, 0xa688ff);
    makeRoundedTex(this, 'paddle', 96, 16, 0x2a7fff);
    makeRoundedTex(this, 'ball', 14, 14, 0xaee8ff);
  }

  create() {
    // 读取存档
    const save = Save.load();
    this.level = save.level;
    this.highScore = save.highScore;
    this.paddleSpeedFactor = save.sensitivity;

    // 世界边界
    this.physics.world.setBoundsCollision(true, true, true, false);

    // UI
    const W = this.scale.width, H = this.scale.height;
    this.ui.title = this.add.text(W/2, 8, '打砖块游戏', {fontSize:'24px', color:'#fff'}).setOrigin(0.5,0).setDepth(5);
    this.ui.score = this.add.text(12, 8, '', {fontSize:'16px', color:'#fff'}).setDepth(5);
    this.ui.lives = this.add.text(12, 30, '', {fontSize:'16px', color:'#fff'}).setDepth(5);
    this.ui.level = this.add.text(W-12, 8, '', {fontSize:'16px', color:'#fff'}).setOrigin(1,0).setDepth(5);
    this.ui.high = this.add.text(W-12, 30, '', {fontSize:'16px', color:'#fff'}).setOrigin(1,0).setDepth(5);
    this.ui.toast = this.add.text(W/2, H-28, '', {fontSize:'14px', color:'#fff'}).setOrigin(0.5).setAlpha(0);

    // 挡板
    this.paddle = this.physics.add.image(W/2, H - 48, 'paddle').setImmovable(true);
    this.paddle.body.allowGravity = false;
    this.paddle.setCollideWorldBounds(true);

    // 球
    this.ball = this.physics.add.image(W/2, this.paddle.y - 18, 'ball').setCircle(7);
    this.ball.setCollideWorldBounds(true, 1, 1);
    this.ball.setBounce(1,1);
    this.ball.setData('onPaddle', true);

    // 磁砖
    this.createBricksForLevel(this.level);

    // 碰撞
    this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);

    // 输入：键盘 + 触控
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // 点击发球 / 暂停恢复
    this.input.on('pointerup', () => {
      if (this.scene.isPaused()) { this.resumeGame(); return; }
      if (this.ball.getData('onPaddle')) this.launchBall();
    });

    // 鼠标滚轮：调整灵敏度（PC）
    this.input.on('wheel', (_p, _o, _dx, dy) => {
      const step = (dy > 0 ? -0.1 : 0.1);
      this.paddleSpeedFactor = Phaser.Math.Clamp(this.paddleSpeedFactor + step, 0.5, 2.0);
      this.toast(`灵敏度: ${this.paddleSpeedFactor.toFixed(1)}`);
      this.saveNow();
    });

    // 初始 UI 刷新
    this.score = 0;
    this.lives = 3;
    this.refreshUI();

    // 窗口尺寸变化时（自适应容器）
    this.scale.on('resize', () => this.layout());

    // 失焦暂停（可选）
    this.game.events.on('hidden', () => this.pauseGame(true));
    this.game.events.on('visible', () => {/*不自动恢复，等用户点*/});
  }

  update() {
    // 暂停键
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
      if (this.scene.isPaused()) this.resumeGame(); else this.pauseGame();
    }
    // 重置键（回到当前关起始状态）
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.resetBall(true);
    }

    // 挡板移动：键盘/触控/鼠标
    const speed = 420 * this.paddleSpeedFactor;
    if (this.cursors.left.isDown) {
      this.paddle.x -= speed * this.game.loop.delta / 1000;
    } else if (this.cursors.right.isDown) {
      this.paddle.x += speed * this.game.loop.delta / 1000;
    } else if (this.input.activePointer.isDown) {
      // 触控/鼠标跟随（带平滑）
      const targetX = this.input.activePointer.worldX;
      this.paddle.x = Phaser.Math.Linear(this.paddle.x, targetX, 0.25);
    }
    this.paddle.x = Phaser.Math.Clamp(this.paddle.x, this.paddle.displayWidth/2, this.scale.width - this.paddle.displayWidth/2);

    // 球掉落
    if (this.ball.y > this.scale.height + 24) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.resetBall(false);
      }
      this.refreshUI();
    }
  }

  // ---------- 关卡与难度 ----------
  createBricksForLevel(lv) {
    const W = this.scale.width;
    const cols = 10;
    const baseRows = 6;
    const addRows = Math.min(6, Math.floor((lv-1)/1)); // 每级 +1 行，上限再限制
    const rows = baseRows + addRows;

    const colors = ['brick-blue','brick-red','brick-green','brick-yellow','brick-gray','brick-purple'];
    const cellW = 64, cellH = 24, pad = 6;
    const totalW = cols*cellW + (cols-1)*pad;
    const startX = (W - totalW)/2 + cellW/2;
    const startY = 120;

    if (this.bricks) this.bricks.clear(true,true);
    this.bricks = this.physics.add.staticGroup();

    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        const key = colors[r % colors.length];
        const brick = this.bricks.create(startX + c*(cellW+pad), startY + r*(cellH+pad), key);
        brick.setData('score', 10 + r*2);
      }
    }

    // 难度系数：球速 & 挡板宽度
    const speedBase = 220 + lv*30; // 每级更快
    this.ball.setMaxVelocity(800, 800);
    this.ballSpeed = speedBase;

    const paddleBase = 120;
    const paddleWidth = Math.max(64, paddleBase - (lv-1)*8); // 每级更短，最短 64
    this.paddle.setTexture('paddle');
    this.paddle.displayWidth = paddleWidth;
    this.paddle.displayHeight = 16;

    this.refreshUI();
  }

  launchBall() {
    this.ball.setData('onPaddle', false);
    const angle = Phaser.Math.FloatBetween(-0.4, 0.4);
    this.ball.setVelocity(Math.sin(angle)*this.ballSpeed, -this.ballSpeed);
  }

  resetBall(centerPaddle = false) {
    if (centerPaddle) {
      this.paddle.x = this.scale.width/2;
    }
    this.ball.setVelocity(0,0);
    this.ball.setPosition(this.paddle.x, this.paddle.y - 18);
    this.ball.setData('onPaddle', true);
  }

  hitPaddle(ball, paddle) {
    const diff = Phaser.Math.Clamp((ball.x - paddle.x) / (paddle.displayWidth/2), -1, 1);
    const vx = diff * this.ballSpeed;
    const vy = -Math.abs(this.ballSpeed);
    ball.setVelocity(vx, vy);
  }

  hitBrick(ball, brick) {
    const add = brick.getData('score') || 10;
    this.score += add;
    brick.disableBody(true, true);

    if (this.bricks.countActive() === 0) {
      // 下一关
      this.level += 1;
      this.toast(`进入第 ${this.level} 关！`);
      this.createBricksForLevel(this.level);
      this.resetBall(true);
      this.saveNow();
    }
    this.refreshUI();
  }

  pauseGame(silent=false) {
    if (this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.launch('Pause', { score: this.score, level: this.level, silent });
  }
  resumeGame() {
    if (!this.scene.isPaused()) return;
    this.scene.stop('Pause');
    this.scene.resume();
  }

  gameOver() {
    // 记录最高分与关卡
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.saveNow(true);
    this.scene.start('GameOver', { score: this.score, level: this.level, high: this.highScore });
  }

  refreshUI() {
    this.ui.score.setText(`分数: ${this.score}`);
    this.ui.lives.setText(`生命: ${this.lives}`);
    this.ui.level.setText(`关卡: ${this.level}`);
    this.ui.high.setText(`最高: ${this.highScore}`);
  }

  layout() {
    // 可以按需扩展：自适应 UI 位置
  }

  toast(text) {
    this.ui.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.ui.toast);
    this.tweens.add({ targets: this.ui.toast, alpha: 0, duration: 900, delay: 600, ease: 'Quad.easeOut' });
  }

  saveNow(resetLives=false) {
    Save.write({ level: this.level, highScore: this.highScore, sensitivity: this.paddleSpeedFactor });
    if (resetLives) this.lives = 3;
  }
}

class PauseScene extends Phaser.Scene {
  constructor(){ super('Pause'); }
  init(data){ this.dataFromGame = data || {}; }
  create(){
    const { width:W, height:H } = this.scale;
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.55);
    const lines = [
      '已暂停',
      `分数：${this.dataFromGame.score ?? 0}   关卡：${this.dataFromGame.level ?? 1}`,
      '按 P 或点击屏幕继续',
      '按 R 重新发球（当前关）',
      'PC：滚轮调节灵敏度；← → 或鼠标/触控操作挡板'
    ];
    lines.forEach((t,i)=> this.add.text(W/2, H/2 - 40 + i*24, t, {fontSize:'16px', color:'#fff'}).setOrigin(0.5));
    this.input.keyboard.once('keydown-P', ()=> this.scene.get('Breakout').resumeGame());
    this.input.once('pointerup', ()=> this.scene.get('Breakout').resumeGame());
  }
}

class GameOver extends Phaser.Scene {
  constructor(){ super('GameOver'); }
  init(data){ this.finalScore = data.score||0; this.level = data.level||1; this.high = data.high||0; }
  create(){
    const { width:W, height:H } = this.scale;
    this.add.text(W/2, H/2 - 40, 'Game Over', {fontSize:'40px', color:'#fff'}).setOrigin(0.5);
    this.add.text(W/2, H/2, `分数：${this.finalScore}   关卡：${this.level}`, {fontSize:'20px', color:'#fff'}).setOrigin(0.5);
    this.add.text(W/2, H/2 + 30, `最高：${this.high}`, {fontSize:'18px', color:'#fff'}).setOrigin(0.5);
    this.add.text(W/2, H/2 + 70, '点击屏幕或按空格重新开始', {fontSize:'16px', color:'#fff'}).setOrigin(0.5);

    this.input.once('pointerup', ()=> this.restart());
    this.input.keyboard.once('keydown-SPACE', ()=> this.restart());
  }
  restart(){
    // 读存档，保留灵敏度 & 继续从已解锁关开始
    const save = Save.load();
    this.scene.start('Breakout', { });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [Breakout, PauseScene, GameOver]
};

new Phaser.Game(config);

/* ===== World MiniKit hooks (safe append) =====
 * - 自动尝试登录（不影响游戏流程，失败静默）
 * - 在 GameOver.init(data) 阶段上报分数（若可用）
 * - 不要求改你原有类名/场景，只要有 GameOver.init(data)
 * ============================================ */
(function () {
  if (typeof window === 'undefined') return;

  // 尝试静默登录：页面准备好就调一次
  const tryLogin = () => {
    try {
      if (window.worldAPI && typeof worldAPI.login === 'function') {
        worldAPI.login().catch(() => {});
      }
    } catch (e) {}
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    tryLogin();
  } else {
    window.addEventListener('DOMContentLoaded', tryLogin, { once: true });
  }

  // 给 GameOver 场景打补丁：init(data) 时上报分数
  function attachScoreHook() {
    try {
      if (!window.GameOver || !GameOver.prototype) return;
      if (GameOver.prototype.__worldHooked) return; // 只挂一次

      const _init = GameOver.prototype.init;
      GameOver.prototype.init = function (data) {
        try { if (typeof _init === 'function') _init.call(this, data); } catch (e) {}

        // data.score 或 this.finalScore 任取可用的
        const score =
          (data && typeof data.score === 'number' ? data.score : null) ??
          (typeof this.finalScore === 'number' ? this.finalScore : 0);

        try {
          if (window.worldAPI && typeof worldAPI.trackScore === 'function') {
            worldAPI.trackScore(score);
          }
        } catch (e) {}
      };

      GameOver.prototype.__worldHooked = true;
    } catch (e) {}
  }

  // 立即尝试挂钩，并在短时间内轮询几次，确保类已加载
  attachScoreHook();
  const iv = setInterval(attachScoreHook, 500);
  setTimeout(() => clearInterval(iv), 10000);
})();
 /* ===== end hooks ===== */
