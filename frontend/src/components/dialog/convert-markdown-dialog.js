import React from 'react';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import Loading from '../loading';
import { gettext } from '../../utils/constants';

function ConvertMarkdownDialog() {
  return (
    <Modal isOpen={true} className="loading-dialog">
      <ModalBody>
        <Loading />
        <div className='d-flex justify-content-center'>{gettext('Converting')}</div>
      </ModalBody>
    </Modal>
  );
}

export default ConvertMarkdownDialog;
