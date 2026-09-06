(function(){
  'use strict';
  const forms=new Map();
  window.FinTrackForms={
    register(name,handler){ forms.set(name,handler); },
    open(name,...args){ const handler=forms.get(name); if(!handler) throw new Error(`Formulário não registrado: ${name}`); return handler(...args); },
    names(){ return [...forms.keys()]; }
  };
})();
