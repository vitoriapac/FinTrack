(function(){
  'use strict';
  const views=new Map();
  window.FinTrackViews={
    register(name,renderer){ views.set(name,renderer); },
    render(name){
      const renderer=views.get(name);
      if(!renderer) throw new Error(`View não registrada: ${name}`);
      return renderer();
    },
    names(){ return [...views.keys()]; }
  };
})();
