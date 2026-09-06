(function(){
  window.FinTrackFilters={bind(main){
    const fm=main.querySelector('#filtro-mes'); if(fm) fm.onchange=()=>{lancFiltro.mes=Number(fm.value);render();};
    const fa=main.querySelector('#filtro-ano'); if(fa) fa.onchange=()=>{lancFiltro.ano=Number(fa.value);render();};
    const fc=main.querySelector('#filtro-categoria'); if(fc) fc.onchange=()=>{lancFiltro.categoriaId=fc.value;render();};
    const fb=main.querySelector('#filtro-busca'); if(fb){fb.oninput=()=>{lancFiltro.busca=fb.value;};fb.onkeyup=e=>{if(e.key==='Enter')render();};fb.onblur=()=>render();}
    const fab=main.querySelector('#filtro-ano-balanco'); if(fab) fab.onchange=()=>{balancoAno=Number(fab.value);render();};
  }};
})();
