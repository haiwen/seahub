import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import Loading from '../loading';
import { gettext } from '../../utils/constants';

function TipDialog() {
  return (
    <Modal isOpen={true}>
      <SeahubModalHeader>{gettext('Import sdoc')}</SeahubModalHeader>
      <ModalBody className='d-flex flex-column justify-content-center align-terms-center' style={{ height: '180px' }}>
        <Loading />
        <div className='d-flex justify-content-center mt-6'>{gettext('Importing sdoc, please wait...')}</div>
      </ModalBody>
    </Modal>
  );
}

export default TipDialog;
