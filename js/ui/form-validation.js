(function(){
  'use strict';
  function clear(control){
    if(!control)return;
    control.removeAttribute('aria-invalid');
    const id=`${control.id}-error`;document.getElementById(id)?.remove();
    const described=(control.getAttribute('aria-describedby')||'').split(/\s+/).filter(item=>item&&item!==id);
    if(described.length)control.setAttribute('aria-describedby',described.join(' '));else control.removeAttribute('aria-describedby');
  }
  function clearAll(root=document){root.querySelectorAll('[aria-invalid="true"]').forEach(clear);}
  function show(errors,summaryId){
    clearAll(document.getElementById('modal-root')||document);let first=null;
    Object.entries(errors).forEach(([controlId,message])=>{const control=document.getElementById(controlId);if(!control||!message)return;clear(control);first=first||control;const error=document.createElement('span');error.id=`${control.id}-error`;error.className='field-error';error.textContent=message;control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',error.id);control.insertAdjacentElement('afterend',error);control.addEventListener('input',()=>clear(control),{once:true});control.addEventListener('change',()=>clear(control),{once:true});});
    const summary=summaryId&&document.getElementById(summaryId);if(summary)summary.textContent=first?'Revise os campos indicados.':'';first?.focus();return !first;
  }
  window.FinTrackFormValidation={show,clear,clearAll};
})();
