import React from 'react';
import ReactDom from 'react-dom';
import ToastManager from './toastManager';

const isBrowser =
    typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * The Toaster manages the interactionsb between
 * the ToasterManger and the toast API.
 */
export default class Toaster {
  constructor() {
    if (!isBrowser) return;

    const container = document.createElement('div');
    container.setAttribute('data-evergreen-toaster-container', '');
    document.body.appendChild(container);

    ReactDom.render(
      <ToastManager
        bindNotify={this._bindNotify}
        bindGetToasts={this._bindGetToasts}
        bindCloseAll={this._bindCloseAll}
      />,
      container
    );
  }

  _bindNotify = handler => {
    this.notifyHandler = handler;
  };

  _bindGetToasts = handler => {
    this.getToastsHandler = handler;
  };

  _bindCloseAll = handler => {
    this.closeAllHandler = handler;
  };

  getToasts = () => {
    return this.getToastsHandler();
  };

  closeAll = () => {
    return this.closeAllHandler();
  };

  notify = (title, settings = {}) => {
    return this.notifyHandler(title, { ...settings, intent: 'none' });
  };

  notifyInProgress = (title, settings = {}) => {
    return this.notifyHandler(title, { ...settings, intent: 'notify-in-progress' });
  };

  success = (title, settings = {}) => {
    return this.notifyHandler(title, { ...settings, intent: 'success' });
  };

  warning = (title, settings = {}) => {
    return this.notifyHandler(title, { ...settings, intent: 'warning' });
  };

  danger = (title, settings = {}) => {
    return this.notifyHandler(title, { ...settings, intent: 'danger' });
  };
}
