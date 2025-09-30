(function(){
  var box=document.getElementById('errbox');
  if(!box){
    box=document.createElement('pre');
    box.id='errbox';
    box.style.cssText='position:fixed;left:0;top:0;right:0;max-height:40vh;overflow:auto;background:rgba(0,0,0,.85);color:#0f0;font:12px/1.4 monospace;z-index:99999;margin:0;padding:8px;';
    document.body.appendChild(box);
  }
  function ensure(){ if(!document.getElementById('errbox')) document.body.appendChild(box); }
  function log(s){ ensure(); box.textContent += s + "\n"; }
  var _log=console.log; console.log=function(){ log(Array.from(arguments).join(' ')); _log.apply(console,arguments); };
  window.addEventListener('error', e=>{ log('[error] '+e.message+' @'+(e.filename||'')+':'+(e.lineno||'')); });
  window.addEventListener('unhandledrejection', e=>{ var r=e.reason; log('[promise] '+(r&&r.message?r.message:r)); });
  log('[overlay] ready');
})();
