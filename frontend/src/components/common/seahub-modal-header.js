import React from 'react';
import { ModalHeader } from 'reactstrap';
import '../../css/seahub-modal-header.css';

const SeahubModalHeader = ({ children, ...props }) => {
  const customCloseBtn = (
    <button type="button" className="close seahub-modal-close" data-dismiss="modal" aria-label="Close" onClick={props.toggle}>
      <span className="seahub-modal-close-inner">
        <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
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
