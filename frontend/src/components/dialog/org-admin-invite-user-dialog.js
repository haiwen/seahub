import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import toaster from '../toast';
import copy from '../copy-to-clipboard';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  invitationLink: PropTypes.string.isRequired
};

class InviteUserDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  copyLink = () => {
    copy(this.props.invitationLink);
    this.props.toggle();
    const message = gettext('Internal link has been copied to clipboard');
    toaster.success(message), {
      duration: 2
    };
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Invite user')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Send the invitation link to the others, and they will be able to join the organization via scanning the QR code.')}</p>
          <p>{this.props.invitationLink}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.copyLink}>{gettext('Copy')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

InviteUserDialog.propTypes = propTypes;

export default InviteUserDialog;
