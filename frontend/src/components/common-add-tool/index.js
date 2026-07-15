import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../icon';
import { Utils } from '../../utils/utils';

import './index.css';

function CommonAddTool({ callBack, footerName, className, addIconClassName, hideIcon, style }) {
  return (
    <div
      className={`add-item-btn ${className ? className : ''}`}
      style={style}
      onClick={(e) => { callBack(e); }}
      tabIndex="0"
      role="button"
      onKeyDown={Utils.onKeyDown}
    >
      <div className="add-item-btn-content">
        {!hideIcon && <Icon symbol="plus" className={addIconClassName} />}
        <span className="description text-truncate">{footerName}</span>
      </div>
    </div>
  );
}

CommonAddTool.propTypes = {
  className: PropTypes.string,
  addIconClassName: PropTypes.string,
  footerName: PropTypes.node.isRequired,
  callBack: PropTypes.func.isRequired,
};

export default CommonAddTool;
