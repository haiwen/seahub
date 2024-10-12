import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './index.css';

const Collapse = ({ className, title, children, isCollapse = true }) => {
  const [showChildren, setShowChildren] = useState(isCollapse);

  const toggleShowChildren = useCallback(() => {
    setShowChildren(!showChildren);
  }, [showChildren]);

  return (
    <div className={classnames('file-details-collapse', className)}>
      <div className="file-details-collapse-header">
        <div className="file-details-collapse-header-title">{title}</div>
        <div className="file-details-collapse-header-operation" onClick={toggleShowChildren}>
          <i className={`sf3-font sf3-font-down ${showChildren ? '' : 'rotate-90'}`}></i>
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
  isCollapse: PropTypes.bool,
  className: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.any,
};

export default Collapse;
