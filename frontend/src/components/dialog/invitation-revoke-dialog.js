import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  toggleInvitationRevokeDialog: PropTypes.func.isRequired,
  onRevokeInvitation: PropTypes.func.isRequired,
  revokeUserObj: PropTypes.object.isRequired,
};

class InvitationRevokeDialog extends React.Component {

  toggle = () => {
    this.props.toggleInvitationRevokeDialog(null);
  };

  render() {
    let email = this.props.revokeUserObj.email;

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Revoke Access')} <span className="op-target" title={email}>{email}</span></ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure to revoke access ?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.onRevokeInvitation}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

InvitationRevokeDialog.propTypes = propTypes;

export default InvitationRevokeDialog;
