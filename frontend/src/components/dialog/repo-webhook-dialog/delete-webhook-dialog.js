import React from 'react';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../../utils/constants';

export default function DeleteWebHookDialog({ deleteWebhook, toggleDeleteDialog }) {
  return (
    <Modal isOpen={true} toggle={toggleDeleteDialog}>
      <SeahubModalHeader toggle={toggleDeleteDialog}>{gettext('Delete webhook')}</SeahubModalHeader>
      <ModalBody>
        <p>{gettext('Are you sure you want to delete this webhook?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggleDeleteDialog}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={deleteWebhook}>{gettext('Delete')}</Button>
      </ModalFooter>
    </Modal>
  );
}
