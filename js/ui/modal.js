(function(){
  'use strict';
  let keyHandler=null;
  let previousFocus=null;
  const escValue=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let generatedId=0;
  function improveFormAccessibility(root){
    root.querySelectorAll('.field').forEach(field=>{
      const label=field.querySelector('label');
      const control=field.querySelector('input,select,textarea');
      if(!label||!control) return;
      if(!control.id) control.id=`modal-field-${++generatedId}`;
      if(!label.htmlFor) label.htmlFor=control.id;
    });
    root.querySelectorAll('.form-error').forEach(error=>{
      error.setAttribute('role','alert');
      error.setAttribute('aria-live','polite');
      error.setAttribute('aria-atomic','true');
    });
  }
  function close(){
    if(keyHandler) document.removeEventListener('keydown',keyHandler);
    keyHandler=null;
    document.getElementById('modal-root').innerHTML='';
    previousFocus?.focus?.();
    previousFocus=null;
  }
  function open(title,bodyHtml,onMount){
    const root=document.getElementById('modal-root');
    previousFocus=document.activeElement;
    root.innerHTML=`<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">${escValue(title)}</h3><div id="modal-body">${bodyHtml}</div></div></div>`;
    improveFormAccessibility(root);
    document.getElementById('modal-backdrop').addEventListener('mousedown',e=>{if(e.target.id==='modal-backdrop') close();});
    keyHandler=e=>{
      if(e.key==='Escape'){close();return;}
      if(e.key!=='Tab') return;
      const focusable=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href]')];
      if(!focusable.length) return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keyHandler);
    if(onMount) onMount();
    requestAnimationFrame(()=>root.querySelector('input,select,button')?.focus());
  }
  function confirmAction(message,onConfirm,confirmLabel='Excluir'){
    open('Confirmar',`<p style="margin:0 0 4px;color:var(--muted);font-size:14px;">${message}</p><div class="modal-actions"><button class="btn btn-ghost" id="cf-cancel">Cancelar</button><button class="btn btn-primary" id="cf-ok" style="${confirmLabel==='Excluir'?'background:var(--expense);':''}">${escValue(confirmLabel)}</button></div>`);
    document.getElementById('cf-cancel').onclick=close;
    document.getElementById('cf-ok').onclick=async()=>{close();await onConfirm();};
  }
  function info(title,message){
    open(title,`<p style="margin:0 0 4px;color:var(--muted);font-size:14px;">${message}</p><div class="modal-actions"><button class="btn btn-primary" id="if-ok">Entendi</button></div>`);
    document.getElementById('if-ok').onclick=close;
  }
  window.FinTrackModal={open,close,confirmAction,info};
})();
