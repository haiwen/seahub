import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import Loading from '../loading';
import { gettext } from '../../utils/constants';

import '../../css/convert-markdown.css';

function ConvertMarkdownDialog() {
  return (
    <Modal isOpen={true} centered={true} className="container-markdown-container">
      <ModalBody className='container-markdown-content'>
        <Loading />
        <div className='d-flex justify-content-center'>{gettext('Converting')}...</div>
      </ModalBody>
    </Modal>
  );
}

export default ConvertMarkdownDialog;
