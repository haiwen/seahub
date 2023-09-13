import React from 'react';
import PropTypes from 'prop-types';
import '../../css/common-add-tool.css';

function CommonAddTool(props) {
  const { callBack, footerName, className, addIconClassName } = props;
  return (
    <div className={`add-item-btn ${className ? className : ''}`} onClick={(e) => {callBack(e);}}>
      <span className={`fas fa-plus mr-2 ${addIconClassName || ''}`}></span>
      <span className='add-new-option' title={footerName}>{footerName}</span>
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
