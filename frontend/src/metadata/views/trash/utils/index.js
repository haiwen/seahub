export const initScrollBar = () => {
  const isWin = (navigator.platform === 'Win32') || (navigator.platform === 'Windows');
  if (isWin) {
    const style = document.createElement('style');
    document.head.appendChild(style);
    const sheet = style.sheet;
    sheet.addRule('div::-webkit-scrollbar', 'width: 8px;height: 8px;');
    sheet.addRule('div::-webkit-scrollbar-button', 'display: none;');
    sheet.addRule('div::-webkit-scrollbar-thumb', 'background-color: rgb(206, 206, 212);border-radius: 10px;');
  }
};

/* is weiXin built-in browser */
export const isWeiXinBuiltInBrowser = () => {
  const agent = navigator.userAgent.toLowerCase();
  if (agent.match(/MicroMessenger/i) === 'micromessenger' ||
    (typeof window.WeixinJSBridge !== 'undefined')) {
    return true;
  }
  return false;
};

export const isWindowsBrowser = () => {
  return /windows|win32/i.test(navigator.userAgent);
};

export const isWebkitBrowser = () => {
  let agent = navigator.userAgent.toLowerCase();
  return agent.includes('webkit');
};
