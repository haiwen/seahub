import React from 'react';
import ReactDOM from 'react-dom';
import NoticeContainer from './notice-container';
import './toast.css';

function createNotieContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const noticeContainer = ReactDOM.render(<NoticeContainer />, div);
  return {
    addNotice(notice) {
      return noticeContainer.addNotice(notice);
    },
    destroy() {
      ReactDOM.unmountComponentAtNode(div);
      document.body.removeChild(div);
    }
  };
}

let noticeContainer = null;
const notice = (type, content, duration = 2000, onClose) => {
  if (!noticeContainer) noticeContainer = createNotieContainer();
  return noticeContainer.addNotice({ type, content, duration, onClose });
};

export default {
  info(content, duration, onClose) {
    return notice('info', content, duration, onClose);
  },
  success(content, duration, onClose) {
    return notice('success', content, duration, onClose);
  },
  warning(content, duration, onClose) {
    return notice('warning', content, duration, onClose);
  },
  error(content, duration, onClose) {
    return notice('danger', content, duration, onClose);
  }
};