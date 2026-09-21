(function(){
  window.FinTrackNavigation={mount(){
    const nav=document.getElementById('nav');
    if(!nav||nav.dataset.bound==='true') return;
    nav.dataset.bound='true';
    const mobileToggle=document.getElementById('nav-mobile-toggle'),closeMobile=()=>{document.querySelector('.sidebar')?.classList.remove('nav-open');mobileToggle?.setAttribute('aria-expanded','false');};
    nav.addEventListener('click',e=>{const group=e.target.closest('.nav-group-toggle');if(group){const expanded=group.getAttribute('aria-expanded')==='true',submenu=group.nextElementSibling;group.setAttribute('aria-expanded',String(!expanded));submenu.hidden=expanded;return;}const btn=e.target.closest('.nav-item');if(btn)setView(btn.dataset.view);});
    mobileToggle?.addEventListener('click',()=>{const sidebar=document.querySelector('.sidebar'),open=!sidebar.classList.contains('nav-open');sidebar.classList.toggle('nav-open',open);mobileToggle.setAttribute('aria-expanded',String(open));document.querySelector('[data-mobile-more]')?.setAttribute('aria-expanded',String(open));if(open)nav.querySelector('button')?.focus();});
    document.querySelectorAll('[data-mobile-view]').forEach(button=>button.addEventListener('click',()=>{closeMobile();setView(button.dataset.mobileView);}));
    document.querySelector('[data-mobile-new]')?.addEventListener('click',()=>{closeMobile();setView('lancamentos');document.getElementById('btn-novo-lancamento')?.click();});
    document.querySelector('[data-mobile-more]')?.addEventListener('click',()=>mobileToggle?.click());
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMobile();window.closeAgendaPanel?.();}});
  }};
})();
