import React from 'react';
import { ModalHeader } from 'reactstrap';
import { gettext } from '../../utils/constants';
import Icon from '../icon';
import '../../css/seahub-modal-header.css';

const SeahubModalHeader = ({ children, ...props }) => {
  const customCloseBtn = (
    <button type="button" className="close seahub-modal-btn" data-dismiss="modal" aria-label={gettext('Close')} title={gettext('Close')} onClick={props.toggle}>
      <span className="seahub-modal-btn-inner">
        <Icon symbol="x-01" />
      </span>
    </button>
  );
  return (
    <ModalHeader {...props} close={customCloseBtn}>
      {children}
    </ModalHeader>
  );
};

export default SeahubModalHeader;
