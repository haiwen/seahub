import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { CAPTURE_INFO_SHOW_KEY } from '../../../../../constants';
import OpIcon from '@/components/op-icon';
import { gettext } from '@/utils/constants';

import './index.css';

const Collapse = ({ className, title, children, isShow = true }) => {
  const [showChildren, setShowChildren] = useState(isShow);

  const toggleShowChildren = useCallback(() => {
    setShowChildren(!showChildren);
    window.localStorage.setItem(CAPTURE_INFO_SHOW_KEY, !showChildren);
  }, [showChildren]);

  const prefix = title.split(' ').map(item => item[0]).join('-').toLocaleLowerCase();
  return (
    <div className={classnames('file-details-collapse', className)}>
      <div className="file-details-collapse-header">
        <div className="file-details-collapse-header-title">{title}</div>
        <OpIcon
          id={`${prefix}-collapse-toggle-btn`}
          className={classnames('file-details-collapse-header-operation', showChildren ? '' : 'rotate-90')}
          tooltip={showChildren ? gettext('Fold') : gettext('Unfold')}
          symbol="down"
          op={toggleShowChildren}
        />
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
