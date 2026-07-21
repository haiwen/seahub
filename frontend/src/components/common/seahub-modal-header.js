import React from 'react';
import { ModalHeader } from 'reactstrap';
import { gettext } from '../../utils/constants';
import Icon from '../icon';
import Tooltip from '../tooltip';

import '../../css/seahub-modal-header.css';

const SeahubModalHeader = ({ children, className = '', ...props }) => {
  const customCloseBtn = (
    <button type="button" className="close seahub-modal-btn" data-dismiss="modal" aria-label={gettext('Close')} onClick={props.toggle}>
      <span id="seahub-modal-close-btn" className="seahub-modal-btn-inner">
        <Icon symbol="close" />
        <Tooltip target="seahub-modal-close-btn">{gettext('Close')}</Tooltip>
      </span>
    </button>
  );
  return (
    <ModalHeader {...props} className={`seahub-modal-header ${className}`.trim()} close={customCloseBtn}>
      <div className="seahub-modal-title-content">
        {children}
      </div>
    </ModalHeader>
  );
};

export default SeahubModalHeader;
