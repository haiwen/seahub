import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  currentWorkspace: PropTypes.object.isRequired,
  deleteCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class DeleteWorkspaceDialog extends React.Component {

  toggle = () => {
    this.props.deleteCancel();
  }
  
  render() {
    let currentWorkspace = this.props.currentWorkspace;
    let name = currentWorkspace.name;

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete Workspace')}</ModalHeader>
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

DeleteWorkspaceDialog.propTypes = propTypes;

export default DeleteWorkspaceDialog;
