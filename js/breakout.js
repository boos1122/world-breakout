class Breakout extends Phaser.Scene {
    constructor() {
        super({ key: 'breakout' });

        this.bricks;
        this.paddle;
        this.ball;
    }

    preload() {
        // 载入砖块图集（Phaser 官方示例资源）
        this.load.atlas(
            'assets',
            'assets/games/breakout/breakout.png',
            'assets/games/breakout/breakout.json'
        );
    }

    create() {
        // 启用世界边界（禁用底部）
        this.physics.world.setBoundsCollision(true, true, true, false);

        // 创建 10x6 的砖块矩阵
        this.bricks = this.physics.add.staticGroup({
            key: 'assets',
            frame: [ 'blue1', 'red1', 'green1', 'yellow1', 'silver1', 'purple1' ],
            frameQuantity: 10,
            gridAlign: { width: 10, height: 6, cellWidth: 64, cellHeight: 32, x: 112, y: 100 }
        });

        // 球拍
        this.paddle = this.physics.add.image(this.scale.width / 2, this.scale.height - 50, 'assets', 'paddle1')
            .setImmovable();
        this.paddle.body.collideWorldBounds = true;

        // 球
        this.ball = this.physics.add.image(this.scale.width / 2, this.scale.height - 100, 'assets', 'ball1')
            .setCollideWorldBounds(true)
            .setBounce(1);
        this.ball.setData('onPaddle', true);

        // 碰撞检测
        this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);
        this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);

        // 输入控制
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        // 移动球拍
        if (this.cursors.left.isDown) {
            this.paddle.setVelocityX(-600);
        } else if (this.cursors.right.isDown) {
            this.paddle.setVelocityX(600);
        } else {
            this.paddle.setVelocityX(0);
        }

        // 发射球
        if (this.ball.getData('onPaddle')) {
            this.ball.x = this.paddle.x;

            if (this.cursors.space.isDown) {
                this.ball.setVelocity(-75, -300);
                this.ball.setData('onPaddle', false);
            }
        } else if (this.ball.y > this.scale.height) {
            this.resetBall();
        }
    }

    resetBall() {
        this.ball.setVelocity(0);
        this.ball.setPosition(this.paddle.x, this.scale.height - 100);
        this.ball.setData('onPaddle', true);
    }

    hitBrick(ball, brick) {
        brick.disableBody(true, true);

        if (this.bricks.countActive() === 0) {
            this.resetLevel();
        }
    }

    resetLevel() {
        this.resetBall();

        this.bricks.children.each(function (brick) {
            brick.enableBody(false, 0, 0, true, true);
        });
    }

    hitPaddle(ball, paddle) {
        let diff = 0;

        if (ball.x < paddle.x) {
            diff = paddle.x - ball.x;
            ball.setVelocityX(-10 * diff);
        } else if (ball.x > paddle.x) {
            diff = ball.x - paddle.x;
            ball.setVelocityX(10 * diff);
        } else {
            ball.setVelocityX(2 + Math.random() * 8);
        }
    }
}

// 游戏配置（全屏自适应）
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: Breakout
};

const game = new Phaser.Game(config);
