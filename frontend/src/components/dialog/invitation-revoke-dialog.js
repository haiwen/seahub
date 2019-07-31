import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Loading from '../loading';
import {seafileAPI} from '../../utils/seafile-api';
import toaster from '../toast';
import { Utils } from '../../utils/utils';

import '../../css/invitations.css';

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
    const { loading } = this.state;
    const email =  '<span class="op-target">' + Utils.HTMLescape(accepter) + '</span>';
    let msg = gettext('Are you sure to revoke access of user %s ?');
    msg = msg.replace('%s', email);

    return (
      <Modal isOpen={true} toggle={this.toggle} className="invitation-revoke-dialog">
        <ModalHeader toggle={this.toggle}>{gettext('Revoke Access')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: msg}}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button className="submit-btn" color="primary" onClick={this.onRevokeInvitation} disabled={loading}>{loading ? <Loading/> :gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

InvitationRevokeDialog.propTypes = propTypes;

export default InvitationRevokeDialog;
