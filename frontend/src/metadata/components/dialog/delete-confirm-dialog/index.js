import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const DeleteConfirmDialog = ({ title, content, onToggle, onSubmit }) => {
  return (
    <Modal isOpen={true} toggle={onToggle}>
      <SeahubModalHeader toggle={onToggle}>{title}</SeahubModalHeader>
      <ModalBody>
        <p>{gettext('Are you sure to delete ') + content}</p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={onSubmit}>{gettext('Delete')}</Button>
      </ModalFooter>
    </Modal>
  );
};

DeleteConfirmDialog.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string,
  onToggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default DeleteConfirmDialog;
