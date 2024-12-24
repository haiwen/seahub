import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import Loading from '../loading';

function TipDialog({ modalTitle, modalTip }) {
  return (
    <Modal isOpen={true}>
      <SeahubModalHeader>{modalTitle}</SeahubModalHeader>
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
