import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import Loading from '../loading';
import { gettext } from '../../utils/constants';

function ConvertMarkdownDialog() {
  return (
    <Modal isOpen={true} className="container-markdown-container" style={{width: '300px'}}>
      <ModalBody className='container-markdown-content'>
        <Loading />
        <div className='d-flex justify-content-center'>{gettext('Converting')}...</div>
      </ModalBody>
    </Modal>
  );
}

export default ConvertMarkdownDialog;
