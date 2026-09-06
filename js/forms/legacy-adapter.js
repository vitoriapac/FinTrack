(function(){
  'use strict';
  let handlers={};
  window.FinTrackFormLayer={
    connect(next){ handlers={...next}; },
    open(name,...args){ const handler=handlers[name]; if(typeof handler!=='function') throw new Error(`Implementação de formulário ausente: ${name}`); return handler(...args); },
    names(){ return Object.keys(handlers); }
  };
})();
