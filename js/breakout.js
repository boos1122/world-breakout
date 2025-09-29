class Breakout extends Phaser.Scene {
  constructor() { super({ key: 'Breakout' }); }

  preload () {
    // 运行时生成纹理：球、挡板、砖块
    const g = this.make.graphics({ x:0, y:0, add:false });

    // 球
    g.fillStyle(0x66d9ff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('ballTex', 16, 16);
    g.clear();

    // 挡板
    g.fillStyle(0x99d, 1);
    g.fillRoundedRect(0, 0, 96, 18, 9);
    g.generateTexture('paddleTex', 96, 18);
    g.clear();

    // 砖块
    const colors = [0x5ec8ff, 0xff5a5a, 0x9be15d, 0xffd94d, 0xcfcfcf, 0x9b59b6];
    colors.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillRoundedRect(0, 0, 64, 24, 6);
      g.generateTexture('brickTex' + i, 64, 24);
      g.clear();
    });
  }

  create () {
    const W = this.scale.width;
    const H = this.scale.height;

    // 物理边界（底部不碰撞）
    this.physics.world.setBounds(0, 0, W, H - 1, true, true, true, false);

    // 挡板
    this.paddle = this.physics.add.image(W/2, H - 40, 'paddleTex');
    this.paddle.setImmovable(true).setCollideWorldBounds(true);

    // 球
    this.ball = this.physics.add.image(W/2, H - 56, 'ballTex');
    this.ball.setCollideWorldBounds(true).setBounce(1);
    this.ball.setData('onPaddle', true);

    // 砖块
    this.bricks = this.physics.add.staticGroup();
    const cols = 10, rows = 6, cw = 64, ch = 24, gap = 8;
    const totalW = cols * cw + (cols - 1) * gap;
    let startX = (W - totalW) / 2;
    let startY = 80;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const brick = this.add.image(startX + c*(cw+gap) + cw/2, startY + r*(ch+gap) + ch/2, 'brickTex' + r%6);
        this.bricks.add(brick);
      }
    }

    // 碰撞
    this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, (ball, brick) => {
      brick.destroy();
      if (this.bricks.countActive() === 0) {
        this.ball.disableBody(true, true);
        this.scene.start('GameOver', { score: 1 });
      }
    });

    // 操作：鼠标/触摸移动挡板；点一下发球
    this.input.on('pointermove', (p) => {
      this.paddle.x = Phaser.Math.Clamp(p.x, this.paddle.width/2, W - this.paddle.width/2);
      if (this.ball.getData('onPaddle')) this.ball.x = this.paddle.x;
    });

    this.input.on('pointerup', () => {
      if (this.ball.getData('onPaddle')) {
        this.ball.setVelocity(200, -300);
        this.ball.setData('onPaddle', false);
      }
    });
  }

  update () {
    // 球掉到底部：重置到挡板上
    if (this.ball.y >= this.scale.height - 2) {
      this.resetBall();
    }
  }

  hitPaddle(ball, paddle) {
    // 根据击中位置改变X方向
    const diff = (ball.x - paddle.x) / (paddle.width/2);
    ball.setVelocityX(300 * diff);
  }

  resetBall () {
    this.ball.setVelocity(0);
    this.ball.setPosition(this.paddle.x, this.paddle.y - 16);
    this.ball.setData('onPaddle', true);
  }
}

class GameOver extends Phaser.Scene {
  constructor () { super({ key: 'GameOver' }); }
  init(data){ this.finalScore = data.score || 0; }
  create(){
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W/2, H/2 - 20, 'Game Over', { fontSize: '40px', color:'#fff' }).setOrigin(0.5);
    this.add.text(W/2, H/2 + 20, 'Tap to Restart', { fontSize:'20px', color:'#fff' }).setOrigin(0.5);
    this.input.once('pointerup', () => this.scene.start('Breakout'));
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  physics: { default: 'arcade', arcade: { debug: false }},
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Breakout, GameOver]
};

new Phaser.Game(config);
