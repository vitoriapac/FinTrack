(function(){
  'use strict';
  const analysis=window.FinTrackAnalysisInternals;
  const methods=['recurringExpenses','futureCommitment','emergencyReserve','dataQuality','monthAnomaly','expenseConcentration'];
  if(!analysis||methods.some(method=>typeof analysis[method]!=='function'))throw new Error('Módulos de análise incompletos ou carregados fora de ordem.');
  window.AnalysisService=Object.fromEntries(methods.map(method=>[method,analysis[method]]));
  delete window.FinTrackAnalysisInternals;
})();
