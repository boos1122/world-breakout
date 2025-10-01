(function(){
  function haveCanvas(){ return !!document.querySelector('canvas'); }
  function startProbe(){
    if(haveCanvas() || !window.Phaser) return;
    try{
      var config={
        type: Phaser.CANVAS,
        parent: 'game',
        backgroundColor:'#000000',
        scale:{ mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width:720, height:1280 },
        scene:{ create:function(){ this.add.text(360,640,'Loading…',{font:'36px Arial', color:'#00ff00'}).setOrigin(0.5); } }
      };
      new Phaser.Game(config);
      console.log('[probe] started');
    }catch(e){ console.log('[probe error]', e&&e.message?e.message:e); }
  }
  setTimeout(startProbe, 1200);
})();
