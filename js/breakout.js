class Breakout extends Phaser.Scene {
  constructor () {
    super({ key: 'Breakout' });

    this.bricks = null;
    this.paddle = null;
    this.ball = null;

    this.score = 0;
    this.lives = 3;
    this.scoreText = null;
    this.livesText = null;

    this.targetX = null;        // 触摸/鼠标目标X
    this.smoothFactor = 0.25;   // 挡板缓动比例 0~1

    this.muted = false;         // 静音标记（无声效时也保留开关）
    this.muteText = null;
  }

  preload () {
    // 纯图形实现，不加载外部资源
  }

  create () {
    const W = this.scale.width;
    const H = this.scale.height;

    // 物理边界（底边不开启碰撞）
    this.physics.world.setBoundsCollision(true, true, true, false);

    // 砖块参数
    const cols = 12;
    const rows = 6;
    const bw = 48;  // brick width
    const bh = 18;  // brick height
    const gap = 6;
    const totalW = cols * (bw + gap) - gap;
    const startX = (W - totalW) / 2;
    const startY = 140;

    // 用静态组 + graphics 画出砖块纹理（颜色分行）
    this.bricks = this.physics.add.staticGroup();
    const rowColors = [0x61dafb, 0xf04f4f, 0xa6e86d, 0xffda4a, 0xdadada, 0x9a70d6];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (bw + gap) + bw / 2;
        const y = startY + r * (bh + gap) + bh / 2;
        const color = rowColors[r % rowColors.length];

        // 每个砖块用一个无体积的 sprite + setSize 来碰撞
        const brick = this.add.rectangle(x, y, bw, bh, color, 1).setStrokeStyle(2, 0x000000, 0.35);
        const body = this.physics.add.existing(brick, true); // static
        body.setSize(bw, bh);
        brick.isBrick = true;
        this.bricks.add(brick);
      }
    }

    // 挡板
    this.paddle = this.add.rectangle(W / 2, H - 80, 110, 16, 0x1677ff)
      .setStrokeStyle(2, 0x000000, 0.3)
      .setOrigin(0.5);
    this.physics.add.existing(this.paddle, true); // static
    this.paddle.body.setCollideWorldBounds(true);

    // 小球
    this.ball = this.add.circle(W / 2, H - 100, 8, 0x9ee6ff).setStrokeStyle(2, 0x01608a, 0.4);
    this.physics.add.existing(this.ball);
    this.ball.body.setCollideWorldBounds(true, 1, 1);
    this.ball.body.setBounce(1, 1);
    this.ball.setData('onPaddle', true);

    // UI：分数、生命、静音
    this.scoreText = this.add.text(16, 12, 'Score: 0', { fontSize: '20px', color: '#fff' });
    this.livesText = this.add.text(W - 16, 12, 'Lives: 3', { fontSize: '20px', color: '#fff' }).setOrigin(1, 0);
    this.muteText  = this.add.text(W - 16, 40, '[Mute: OFF]', { fontSize: '18px', color: '#ccc' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.muteText.on('pointerup', () => {
      this.muted = !this.muted;
      this.muteText.setText(this.muted ? '[Mute: ON]' : '[Mute: OFF]');
    });

    // 开局把球贴在挡板上；点击/按空格发球
    this.resetBall();
    this.input.on('pointerup', () => this.launchBall());
    this.input.keyboard.on('keydown-SPACE', () => this.launchBall());

    // 碰撞：球-挡板
    this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);

    // 碰撞：球-砖块
    this.physics.add.overlap(this.ball, this.bricks, (ball, brick) => {
      // 把“砖块”当成静态矩形，手动反射 & 销毁
      if (!brick || !brick.isBrick) return;

      // 简单碰撞反射（根据相对位置决定Y或X反弹）
      const dx = Math.abs(ball.x - brick.x) - (brick.width / 2);
      const dy = Math.abs(ball.y - brick.y) - (brick.height / 2);
      if (dx > dy) {
        ball.body.setVelocityX(-ball.body.velocity.x);
      } else {
        ball.body.setVelocityY(-ball.body.velocity.y);
      }

      brick.destroy();
      this.score += 10;
      this.scoreText.setText('Score: ' + this.score);

      // 全部清除 -> 进入 GameOver（You Win）
      if (this.bricks.countActive(true) === 0) {
        this.time.delayedCall(300, () => {
          this.scene.start('GameOver', { score: this.score, win: true });
        });
      }
    });

    // 指针移动：只更新目标X，不直接改挡板（让 update 中做缓动）
    this.input.on('pointermove', (p) => {
      this.targetX = Phaser.Math.Clamp(p.x, 50, W - 50);
    });

    // 键盘左右键也能动挡板（给PC）
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update () {
    const W = this.scale.width;
    const H = this.scale.height;

    // 键盘控制（会把 targetX 设置成一个位置，随后由缓动去追随）
    const speed = 14;
    if (this.cursors.left?.isDown)  this.targetX = (this.targetX ?? this.paddle.x) - speed;
    if (this.cursors.right?.isDown) this.targetX = (this.targetX ?? this.paddle.x) + speed;
    if (this.targetX != null) this.targetX = Phaser.Math.Clamp(this.targetX, 50, W - 50);

    // 挡板缓动
    if (this.targetX != null) {
      this.paddle.x += (this.targetX - this.paddle.x) * this.smoothFactor;
      this.paddle.body.updateFromGameObject(); // 静态体需要同步
    }

    // 开球前，让球跟着挡板
    if (this.ball.getData('onPaddle')) {
      this.ball.x = this.paddle.x;
      this.ball.y = this.paddle.y - 24;
      this.ball.body.setVelocity(0, 0);
    } else {
      // 出下边界：掉命
      if (this.ball.y > H + 20) {
        this.lives -= 1;
        this.livesText.setText('Lives: ' + this.lives);
        if (this.lives <= 0) {
          this.scene.start('GameOver', { score: this.score, win: false });
        } else {
          this.resetBall();
        }
      }
    }
  }

  launchBall () {
    if (!this.ball.getData('onPaddle')) return;
    this.ball.setData('onPaddle', false);
    // 初速度给一点随机角度
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-30, 30));
    const speed = 320;
    this.ball.body.setVelocity(Math.cos(angle) * speed, -Math.abs(Math.sin(angle)) * speed - 260);
  }

  hitPaddle (ball, paddle) {
    // 根据撞击位置改变X方向（制造可控回弹）
    const diff = Phaser.Math.Clamp((ball.x - paddle.x) / (paddle.width / 2), -1, 1);
    const speed = ball.body.velocity.length();
    const newVX = diff * Math.max(220, speed * 0.9);
    const newVY = -Math.max(260, speed * 0.9);
    ball.body.setVelocity(newVX, newVY);
  }

  resetBall () {
    this.ball.setData('onPaddle', true);
  }
}

class GameOver extends Phaser.Scene {
  constructor () {
    super({ key: 'GameOver' });
  }
  init (data) {
    this.finalScore = data.score || 0;
    this.win = !!data.win;
  }
  create () {
    const W = this.scale.width;
    const H = this.scale.height;
    const title = this.win ? 'You Win!' : 'Game Over';
    this.add.text(W/2, H/2 - 20, title, { fontSize: '42px', color: '#fff' }).setOrigin(0.5);
    this.add.text(W/2, H/2 + 30, 'Score: ' + this.finalScore, { fontSize: '26px', color: '#fff' }).setOrigin(0.5);
    this.add.text(W/2, H/2 + 80, 'Tap or Press SPACE to Restart', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);

    this.input.once('pointerup', () => this.scene.start('Breakout'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Breakout'));
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, parent: 'game' },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [Breakout, GameOver]
};

new Phaser.Game(config);
