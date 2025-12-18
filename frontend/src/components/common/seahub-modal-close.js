import React from 'react';
import { gettext } from '../../utils/constants';
import '../../css/seahub-modal-header.css';
import Icon from '../icon';

const SeahubModalCloseIcon = (props) => {
  return (
    <button type="button" className={`close seahub-modal-btn ${props.className ? props.className : ''}`} data-dismiss="modal" aria-label={gettext('Close')} title={gettext('Close')} onClick={props.toggle}>
      <span className="seahub-modal-btn-inner">
        <Icon symbol="close" />
      </span>
    </button>
  );
};

export default SeahubModalCloseIcon;
