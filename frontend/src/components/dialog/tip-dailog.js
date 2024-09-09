import React from 'react';
import { Loading } from 'dtable-ui-component';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';

function TipDialog({ modalTitle, modalTip }) {
  return (
    <Modal isOpen={true}>
      <ModalHeader>{modalTitle}</ModalHeader>
      <ModalBody className='d-flex flex-column justify-content-center align-terms-center' style={{ height: '180px' }}>
        <Loading />
        <div className='d-flex justify-content-center mt-6'>{modalTip}</div>
      </ModalBody>
    </Modal>
  );
}

TipDialog.propTypes = {
  modalTitle: PropTypes.string.isRequired,
  modalTip: PropTypes.string.isRequired,
};

export default TipDialog;
