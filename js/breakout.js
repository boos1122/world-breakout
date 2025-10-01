class Breakout extends Phaser.Scene {
  constructor(){ super({ key:'Breakout' }); }

  preload(){
    this.load.image('paddle','assets/paddle.png');
    this.load.image('ball','assets/ball.png');
    this.load.image('brick','assets/brick.png');

    this.load.on('loaderror', () => {
      if (!this.textures.exists('paddle')) {
        const g=this.make.graphics({add:false}); g.fillStyle(0x00ffcc,1).fillRoundedRect(0,0,96,16,6);
        g.generateTexture('paddle',96,16); g.destroy();
      }
      if (!this.textures.exists('ball')) {
        const g=this.make.graphics({add:false}); g.fillStyle(0xffffff,1).fillCircle(8,8,8);
        g.generateTexture('ball',16,16); g.destroy();
      }
      if (!this.textures.exists('brick')) {
        const g=this.make.graphics({add:false}); g.fillStyle(0xff5555,1).fillRoundedRect(0,0,60,24,4);
        g.generateTexture('brick',60,24); g.destroy();
      }
    });
  }

  create(){
    this.score=0; this.lives=3; this.level=1;
    this.scoreText=this.add.text(16,16,'Score: 0',{fontSize:'20px',color:'#fff'});
    this.livesText=this.add.text(650,16,'Lives: 3',{fontSize:'20px',color:'#fff'});

    this.paddle=this.physics.add.image(400,550,'paddle').setImmovable();
    this.paddle.body.allowGravity=false; this.paddle.setCollideWorldBounds(true);

    this.ball=this.physics.add.image(400,530,'ball').setBounce(1).setCollideWorldBounds(true);
    this.ball.setData('onPaddle',true);

    this.createBricks();

    this.physics.add.collider(this.ball,this.paddle,this.hitPaddle,null,this);
    this.physics.add.collider(this.ball,this.bricks,this.hitBrick,null,this);

    this.cursors=this.input.keyboard.createCursorKeys();

    const MIN_X=120;
    this.physics.world.on('collide',()=>{
      if(!this.ball.body) return;
      const vx=this.ball.body.velocity.x, s=Math.sign(vx)||1;
      this.ball.setVelocityX(s*Math.max(Math.abs(vx),MIN_X));
    });
  }

  update(){
    const v=400;
    if(this.cursors.left.isDown) this.paddle.setVelocityX(-v);
    else if(this.cursors.right.isDown) this.paddle.setVelocityX(v);
    else this.paddle.setVelocityX(0);

    if(this.ball.getData('onPaddle')){
      this.ball.x=this.paddle.x;
      if(this.cursors.space.isDown){
        this.ball.setVelocity(-75,-300);
        this.ball.setData('onPaddle',false);
      }
    }

    if(this.ball.y>600){
      this.lives--; this.livesText.setText('Lives: '+this.lives);
      if(this.lives<=0) this.scene.start('GameOver',{score:this.score});
      else this.resetBall();
    }
  }

  createBricks(){
    this.bricks=this.physics.add.staticGroup();
    for(let y=0;y<4+this.level;y++){
      for(let x=0;x<10;x++){
        this.bricks.create(80+x*64,100+y*32,'brick').setOrigin(0,0).refreshBody();
      }
    }
  }

  hitBrick(ball,brick){
    brick.disableBody(true,true);
    this.score+=10; this.scoreText.setText('Score: '+this.score);
    if(this.bricks.countActive()===0){
      this.level++; this.scene.restart({level:this.level,score:this.score,lives:this.lives});
    }
  }

  hitPaddle(ball,paddle){
    const rel=Phaser.Math.Clamp((ball.x-paddle.x)/(paddle.width/2),-1,1);
    ball.setVelocityX(rel*300);
  }

  resetBall(){
    this.ball.setVelocity(0).setPosition(this.paddle.x,530).setData('onPaddle',true);
  }
}

class GameOver extends Phaser.Scene{
  constructor(){ super({key:'GameOver'}); }
  init(data){ this.finalScore=data.score||0; }
  create(){
    this.add.text(400,250,'Game Over',{fontSize:'40px',color:'#ff0000'}).setOrigin(0.5);
    this.add.text(400,320,'Score: '+this.finalScore,{fontSize:'30px',color:'#fff'}).setOrigin(0.5);
    this.add.text(400,400,'Press SPACE to Restart',{fontSize:'20px',color:'#fff'}).setOrigin(0.5);
    this.input.keyboard.once('keydown-SPACE',()=>this.scene.start('Breakout'));
  }
}

const config={
  type:Phaser.AUTO,width:800,height:600,backgroundColor:'#000000',pixelArt:true,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{debug:false}},
  scene:[Breakout,GameOver]
};
new Phaser.Game(config);
