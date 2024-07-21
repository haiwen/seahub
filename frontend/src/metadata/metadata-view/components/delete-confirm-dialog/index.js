import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils';

const DeleteConfirmDialog = ({ title, content, onToggle, onSubmit }) => {
  return (
    <Modal isOpen={true} toggle={onToggle}>
      <ModalHeader toggle={onToggle}>{title}</ModalHeader>
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
