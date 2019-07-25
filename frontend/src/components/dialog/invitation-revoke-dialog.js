import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Loading from '../loading';
import {seafileAPI} from '../../utils/seafile-api';
import toaster from '../toast';

const propTypes = {
  toggleInvitationRevokeDialog: PropTypes.func.isRequired,
  onDeleteInvitation: PropTypes.func.isRequired,
  revokeUserObj: PropTypes.object.isRequired,
};

class InvitationRevokeDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  toggle = () => {
    this.props.toggleInvitationRevokeDialog(null);
  };

  onRevokeInvitation = () => {
    this.setState({
      loading: true,
    });
    const revokeUserObj = this.props.revokeUserObj;
    const token = revokeUserObj.token;
    const index = revokeUserObj.index;

    seafileAPI.revokeInvitation(token).then((res) => {
      this.props.onDeleteInvitation(index);
      this.props.toggleInvitationRevokeDialog(null);
      toaster.success(gettext('Success'), {duration: 1});
    }).catch((error) => {
      this.props.toggleInvitationRevokeDialog(null);
      if (error.response){
        toaster.danger(error.response.data.error_msg || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  };

  render() {
    let accepter = this.props.revokeUserObj.accepter;
    let msg = gettext('Are you sure to revoke %s access ?');
    msg = msg.replace('%s', accepter);

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Revoke Access')}</ModalHeader>
        <ModalBody>
          <p>{msg}</p>
          {this.state.loading && <Loading/>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.onRevokeInvitation} disabled={this.state.loading}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

InvitationRevokeDialog.propTypes = propTypes;

export default InvitationRevokeDialog;
