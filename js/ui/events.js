(function(){
  'use strict';
  const groups=new Map();
  window.FinTrackEvents={
    use(handler){ groups.set('default',handler); },
    register(name,handler){ groups.set(name,handler); },
    attach(){ if(!groups.size) throw new Error('Eventos da interface ainda não foram conectados.'); groups.forEach(handler=>{if(typeof handler==='function') handler();}); },
    names(){ return [...groups.keys()]; }
  };
  window.attachViewHandlers=()=>window.FinTrackEvents.attach();
})();
