var agent = navigator && navigator.userAgent;
var lowCaseAgent = agent && agent.toLocaleLowerCase()
var isWin = lowCaseAgent && (
    (lowCaseAgent.indexOf('win32') > -1 || lowCaseAgent.indexOf('wow32') > -1) ||
    (lowCaseAgent.indexOf('win64') > -1 || lowCaseAgent.indexOf('wow64') > -1)
  )

if (isWin) {
  var style = document.createElement('style');
  document.head.appendChild(style);
  var sheet = style.sheet;
  sheet.insertRule('div::-webkit-scrollbar { width: 8px;height: 8px; }');
  sheet.insertRule('div::-webkit-scrollbar-button { display: none; }');
  sheet.insertRule('div::-webkit-scrollbar-thumb { background-color: rgb(206, 206, 212);border-radius: 10px; }');
  sheet.insertRule('div.vertical-scrollbar::-webkit-scrollbar-thumb { min-height: 40px }');
}
