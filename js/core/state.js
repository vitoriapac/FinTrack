(function(){
  let adapter=null;
  const subscribers=new Set();
  function bind(next){adapter=next;}
  function getState(){return adapter?.get?.()??null;}
  function replaceState(next){if(!adapter?.set) throw new Error('FinTrackState não foi conectado');adapter.set(next);subscribers.forEach(listener=>listener(next));return next;}
  function updateState(updater){return replaceState(updater(getState()));}
  function subscribe(listener){subscribers.add(listener);return()=>subscribers.delete(listener);}
  window.FinTrackState={bind,getState,replaceState,updateState,subscribe};
})();
