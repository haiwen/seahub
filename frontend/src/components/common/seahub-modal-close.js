import React from 'react';
import { gettext } from '../../utils/constants';
import Icon from '../icon';
import Tooltip from '../tooltip';
import '../../css/seahub-modal-header.css';

const SeahubModalCloseIcon = (props) => {
  return (
    <button id="modal-close-btn" type="button" className={`close seahub-modal-btn ${props.className ? props.className : ''}`} data-dismiss="modal" aria-label={gettext('Close')} onClick={props.toggle}>
      <span className="seahub-modal-btn-inner">
        <Icon symbol="close" />
        <Tooltip target="modal-close-btn">{gettext('Close')}</Tooltip>
      </span>
    </button>
  );
};

export default SeahubModalCloseIcon;
