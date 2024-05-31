import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  footer: PropTypes.string.isRequired,
};

function WikiDeleteDialog({ handleSubmit, toggleCancel, title, content, footer }) {
  return (
    <Modal isOpen={true} toggle={toggleCancel}>
      <ModalHeader toggle={toggleCancel}>{title}</ModalHeader>
      <ModalBody>
        <p>{content}</p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggleCancel}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={handleSubmit}>{footer}</Button>
      </ModalFooter>
    </Modal>
  );
}

WikiDeleteDialog.propTypes = propTypes;

export default WikiDeleteDialog;
