import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';

export default class DeleteDialog extends React.Component {

  static propTypes = {
    closeDeleteDialog: PropTypes.func.isRequired,
    handleSubmit: PropTypes.func.isRequired,
  };

  toggle = () => {
    this.props.closeDeleteDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete page')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to delete this page?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}
