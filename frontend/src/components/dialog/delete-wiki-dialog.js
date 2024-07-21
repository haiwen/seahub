import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
  footer: PropTypes.string.isRequired,
};

function DeleteWikiDialog({ handleSubmit, toggleCancel, title, content, footer }) {
  return (
    <Modal isOpen={true} toggle={toggleCancel}>
      <ModalHeader toggle={toggleCancel}>{title}</ModalHeader>
      <ModalBody>{content}</ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggleCancel}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={handleSubmit}>{footer}</Button>
      </ModalFooter>
    </Modal>
  );
}

DeleteWikiDialog.propTypes = propTypes;

export default DeleteWikiDialog;
