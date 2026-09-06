(function(){
  window.FinTrackNavigation={mount(){
    const nav=document.getElementById('nav');
    if(!nav||nav.dataset.bound==='true') return;
    nav.dataset.bound='true';
    nav.addEventListener('click',e=>{const btn=e.target.closest('.nav-item');if(btn) setView(btn.dataset.view);});
  }};
})();
