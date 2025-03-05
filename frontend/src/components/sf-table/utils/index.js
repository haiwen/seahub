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
