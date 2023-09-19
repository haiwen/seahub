import React from 'react';
import { Modal } from 'reactstrap';
import Loading from '../loading';

import './../../css/loading-dialog.css';

function LoadingDialog() {
  return (
    <Modal isOpen={true} className="loading-dialog">
      <Loading />
    </Modal>
  );
}

export default LoadingDialog;
