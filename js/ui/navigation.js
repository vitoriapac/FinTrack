(function(){
  window.FinTrackNavigation={mount(){
    const nav=document.getElementById('nav');
    if(!nav||nav.dataset.bound==='true') return;
    nav.dataset.bound='true';
    const mobileToggle=document.getElementById('nav-mobile-toggle'),closeMobile=()=>{document.querySelector('.sidebar')?.classList.remove('nav-open');mobileToggle?.setAttribute('aria-expanded','false');};
    nav.addEventListener('click',e=>{const group=e.target.closest('.nav-group-toggle');if(group){const expanded=group.getAttribute('aria-expanded')==='true',submenu=group.nextElementSibling;group.setAttribute('aria-expanded',String(!expanded));submenu.hidden=expanded;return;}const btn=e.target.closest('.nav-item');if(btn)setView(btn.dataset.view);});
    mobileToggle?.addEventListener('click',()=>{const sidebar=document.querySelector('.sidebar'),open=!sidebar.classList.contains('nav-open');sidebar.classList.toggle('nav-open',open);mobileToggle.setAttribute('aria-expanded',String(open));if(open)nav.querySelector('button')?.focus();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobile();});
  }};
})();
