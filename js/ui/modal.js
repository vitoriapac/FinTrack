(function(){
  'use strict';
  let keyHandler=null;
  const escValue=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function close(){
    if(keyHandler) document.removeEventListener('keydown',keyHandler);
    keyHandler=null;
    document.getElementById('modal-root').innerHTML='';
  }
  function open(title,bodyHtml,onMount){
    const root=document.getElementById('modal-root');
    root.innerHTML=`<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">${escValue(title)}</h3><div id="modal-body">${bodyHtml}</div></div></div>`;
    document.getElementById('modal-backdrop').addEventListener('mousedown',e=>{if(e.target.id==='modal-backdrop') close();});
    keyHandler=e=>{if(e.key==='Escape') close();};
    document.addEventListener('keydown',keyHandler);
    if(onMount) onMount();
    requestAnimationFrame(()=>root.querySelector('input,select,button')?.focus());
  }
  function confirmAction(message,onConfirm,confirmLabel='Excluir'){
    open('Confirmar',`<p style="margin:0 0 4px;color:var(--muted);font-size:14px;">${message}</p><div class="modal-actions"><button class="btn btn-ghost" id="cf-cancel">Cancelar</button><button class="btn btn-primary" id="cf-ok" style="${confirmLabel==='Excluir'?'background:var(--expense);':''}">${escValue(confirmLabel)}</button></div>`);
    document.getElementById('cf-cancel').onclick=close;
    document.getElementById('cf-ok').onclick=()=>{onConfirm();close();};
  }
  function info(title,message){
    open(title,`<p style="margin:0 0 4px;color:var(--muted);font-size:14px;">${message}</p><div class="modal-actions"><button class="btn btn-primary" id="if-ok">Entendi</button></div>`);
    document.getElementById('if-ok').onclick=close;
  }
  window.FinTrackModal={open,close,confirmAction,info};
})();
