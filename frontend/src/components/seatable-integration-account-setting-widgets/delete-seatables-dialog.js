import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';

class DeleteSeatablesDialog extends Component {

  static propTypes = {
    t: PropTypes.func,
    accountName: PropTypes.string,
    onDeleteSeatables: PropTypes.func,
    closeDialog: PropTypes.func,
  };

  render () {
    const { accountName, closeDialog } = this.props;
    return (
      <Modal isOpen={true} toggle={closeDialog}>
        <ModalHeader toggle={closeDialog}>{gettext('Delete SeaTable base')}</ModalHeader>
        <ModalBody>
          <div className="pb-6">{gettext('Are you sure to delete SeaTable')}{' '}{accountName}?</div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={closeDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.onDeleteSeatables}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export default DeleteSeatablesDialog;
