import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../icon';

import './index.css';

function CommonAddTool({ callBack, footerName, className, addIconClassName, hideIcon, style }) {
  return (
    <div className={`add-item-btn ${className ? className : ''}`} style={style} onClick={(e) => {callBack(e);}}>
      {!hideIcon && <Icon symbol="add-table" className={addIconClassName} />}
      <span className="description text-truncate">{footerName}</span>
    </div>
  );
}

CommonAddTool.propTypes = {
  className: PropTypes.string,
  addIconClassName: PropTypes.string,
  footerName: PropTypes.string.isRequired,
  callBack: PropTypes.func.isRequired,
};

export default CommonAddTool;
