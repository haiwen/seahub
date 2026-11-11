import React from 'react';
import { ModalHeader } from 'reactstrap';
import { gettext } from '@/utils/constants';
import Icon from '../icon';
import Tooltip from '../tooltip';

import './seahub-modal-header.css';

const SeahubModalHeader = ({ children, className = '', isShowClose = true, isShowCloseTooltip = true, ...props }) => {
  const closeBtnId = isShowCloseTooltip ? 'seahub-modal-close-btn' : undefined;
  const customCloseBtn = (
    <button type="button" className="close seahub-modal-btn" data-dismiss="modal" aria-label={gettext('Close')} onClick={props.toggle}>
      <span id={closeBtnId} className="seahub-modal-btn-inner">
        <Icon symbol="close" />
        {isShowCloseTooltip && <Tooltip target={closeBtnId}>{gettext('Close')}</Tooltip>}
      </span>
    </button>
  );
  return (
    <ModalHeader
      {...props}
      toggle={isShowClose ? props.toggle : undefined}
      className={`seahub-modal-header ${className}`.trim()}
      close={isShowClose ? customCloseBtn : null}
    >
      <div className="seahub-modal-title-content">
        {children}
      </div>
    </ModalHeader>
  );
};

export default SeahubModalHeader;
