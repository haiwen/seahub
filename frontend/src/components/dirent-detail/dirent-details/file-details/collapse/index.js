import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { CAPTURE_INFO_SHOW_KEY } from '../../../../../constants';

import './index.css';

const Collapse = ({ className, title, children, isShow = true }) => {
  const [showChildren, setShowChildren] = useState(isShow);

  const toggleShowChildren = useCallback(() => {
    setShowChildren(!showChildren);
    window.localStorage.setItem(CAPTURE_INFO_SHOW_KEY, !showChildren);
  }, [showChildren]);

  return (
    <div className={classnames('file-details-collapse', className)}>
      <div className="file-details-collapse-header">
        <div className="file-details-collapse-header-title">{title}</div>
        <div className="file-details-collapse-header-operation" onClick={toggleShowChildren}>
          <i aria-hidden="true" className={`sf3-font sf3-font-down ${showChildren ? '' : 'rotate-90'}`}></i>
        </div>
      </div>
      {showChildren && (
        <div className="file-details-collapse-body">
          {children}
        </div>
      )}
    </div>
  );
};

Collapse.propTypes = {
  isShow: PropTypes.bool,
  className: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.any,
};

export default Collapse;
