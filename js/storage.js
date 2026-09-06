(function(){
  'use strict';
  async function get(key){
    const result=await window.storage.get(key,false);
    return JSON.parse(result.value);
  }
  async function set(key,value){
    await window.storage.set(key,JSON.stringify(value),false);
  }
  async function load(key,fallback){
    try{return await get(key);}catch(e){return fallback;}
  }
  window.FinTrackStorage={get,set,load};
})();
