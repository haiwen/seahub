import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  currentWorkspace: PropTypes.object.isRequired,
  leaveUserShareCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class LeaveShareWorkspaceDialog extends React.Component {

  toggle = () => {
    this.props.leaveUserShareCancel();
  };

  render() {
    let currentWorkspace = this.props.currentWorkspace;
    let name = currentWorkspace.name;

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Leave Share Workspace')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure to leave share')}{' '}<b>{name}</b> ?</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

LeaveShareWorkspaceDialog.propTypes = propTypes;

export default LeaveShareWorkspaceDialog;
