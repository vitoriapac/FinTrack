(function(){
  'use strict';

  const memory = new Map();
  const hasPlatformStorage = () => typeof window.storage?.get === 'function' && typeof window.storage?.set === 'function';
  const hasLocalStorage = () => typeof window.localStorage?.getItem === 'function' && typeof window.localStorage?.setItem === 'function';

  async function get(key){
    if(hasPlatformStorage()){
      const result=await window.storage.get(key,false);
      if(!result || result.value===undefined || result.value===null) throw new Error(`Chave não encontrada: ${key}`);
      return JSON.parse(result.value);
    }
    const raw=hasLocalStorage()?window.localStorage.getItem(key):memory.get(key);
    if(raw===undefined || raw===null) throw new Error(`Chave não encontrada: ${key}`);
    return JSON.parse(raw);
  }
  async function set(key,value){
    const serialized=JSON.stringify(value);
    if(hasPlatformStorage()){ await window.storage.set(key,serialized,false); return; }
    if(hasLocalStorage()){ window.localStorage.setItem(key,serialized); return; }
    memory.set(key,serialized);
  }
  async function load(key,fallback){
    try{return await get(key);}catch(e){return fallback;}
  }
  window.FinTrackStorage={get,set,load};
})();
