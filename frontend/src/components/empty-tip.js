import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../utils/constants';
import '../css/empty-tip.css';

function EmptyTip({ forDialog, className, title, text, children }) {
  return (
    <div className={forDialog ? `${className || 'text-center mt-8'}` : 'empty-tip'}>
      <img src={`${mediaUrl}img/no-items-tip.png`} alt="" width="100" height="100" className="no-items-img-tip" />
      {title && <span className="empty-tip-title">{title}</span>}
      {text && <span className="empty-tip-text">{text}</span>}
      {children}
    </div>
  );
}

EmptyTip.propTypes = {
  forDialog: PropTypes.bool,
  className: PropTypes.string,
  title: PropTypes.string,
  text: PropTypes.string,
  children: PropTypes.any,
};

export default EmptyTip;
