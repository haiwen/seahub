import React from 'react';
import { gettext } from '../../utils/constants';
import '../../css/seahub-modal-header.css';

const SeahubModalCloseIcon = (props) => {
  return (
    <button type="button" className={`close seahub-modal-btn ${props.className ? props.className : ''}`} data-dismiss="modal" aria-label={gettext('Close')} onClick={props.toggle}>
      <span className="seahub-modal-btn-inner">
        <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
      </span>
    </button>
  );
};

export default SeahubModalCloseIcon;
