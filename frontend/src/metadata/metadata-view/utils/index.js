import getEventTransfer from './get-event-transfer';
import CellValueUtils from './cell-value-utils';
import { gettext } from '../../../utils/constants';

export const getEventClassName = (e) => {
  // svg mouseEvent event.target.className is an object
  if (!e || !e.target) return '';
  return e.target.getAttribute('class') || '';
};

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

export const isMobile = (typeof (window) !== 'undefined') && (window.innerWidth < 768 ||
  navigator.userAgent.toLowerCase().match(/(ipod|ipad|iphone|android|coolpad|mmp|smartphone|midp|wap|xoom|symbian|j2me|blackberry|wince)/i) != null);

export const addClassName = (originClassName, targetClassName) => {
  const originClassNames = originClassName.split(' ');
  if (originClassNames.indexOf(targetClassName) > -1) return originClassName;
  return originClassName + ' ' + targetClassName;
};

export const removeClassName = (originClassName, targetClassName) => {
  let originClassNames = originClassName.split(' ');
  const targetClassNameIndex = originClassNames.indexOf(targetClassName);
  if (targetClassNameIndex < 0) return originClassName;
  originClassNames.splice(targetClassNameIndex, 1);
  return originClassNames.join(' ');
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

export {
  gettext,
  getEventTransfer,
  CellValueUtils,
};
