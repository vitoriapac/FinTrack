(function(){
  'use strict';
  const nextDay=date=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+1);return value.toISOString().slice(0,10);};
  const previousDay=date=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()-1);return value.toISOString().slice(0,10);};
  function analyze(state){
    const active=(state.importBatches||[]).filter(batch=>batch.status==='active');
    const ids=new Set([...(state.contas||[]).map(account=>account.id),...active.map(batch=>batch.accountId)]);
    return [...ids].map(accountId=>{
      const batches=active.filter(batch=>batch.accountId===accountId);
      const intervals=batches.filter(batch=>batch.period&&window.FinTrackBankImport.statementPeriod(batch.period.from,batch.period.to,batch.period.kind)).map(batch=>({batchId:batch.id,fileName:batch.fileName,from:batch.period.from,to:batch.period.to,kind:batch.period.kind})).sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
      const merged=[],gaps=[],overlaps=[];
      for(const interval of intervals){
        const last=merged.at(-1);
        if(!last){merged.push({from:interval.from,to:interval.to});continue;}
        if(interval.from<=last.to){overlaps.push({batchId:interval.batchId,from:interval.from,to:interval.to<last.to?interval.to:last.to});if(interval.to>last.to)last.to=interval.to;}
        else if(interval.from===nextDay(last.to))last.to=interval.to;
        else {gaps.push({from:nextDay(last.to),to:previousDay(interval.from)});merged.push({from:interval.from,to:interval.to});}
      }
      return {accountId,intervals,merged,gaps,overlaps,unknownCount:batches.length-intervals.length,status:intervals.length?'known':'unknown'};
    });
  }
  window.FinTrackImportCoverage={analyze};
})();
