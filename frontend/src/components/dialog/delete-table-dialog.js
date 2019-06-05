import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  currentTable: PropTypes.object.isRequired,
  deleteCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class DeleteTableDialog extends React.Component {

  toggle = () => {
    this.props.deleteCancel();
  }
  
  render() {
    let currentTable = this.props.currentTable;
    let name = currentTable.name;

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete Table')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure to delete')}{' '}<b>{name}</b> ?</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteTableDialog.propTypes = propTypes;

export default DeleteTableDialog;
