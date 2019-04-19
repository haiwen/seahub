import React from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {seafileAPI} from '../../utils/seafile-api';
import {Modal, ModalHeader, ModalBody, ModalFooter, Input, Button} from 'reactstrap';
import InvitationsToolbar from "../toolbar/invitations-toolbar";

class InvitePeopleDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      emails: '',
      errorMsg: '',
    };
  }

  handleEmailsChange = (event) => {
    let emails = event.target.value;
    this.setState({
      emails: emails
    });
    if (this.state.errorMsg) {
      this.setState({
        errorMsg: ''
      });
    }
  }

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      this.handleSubmitInvite();
    }
  }

  handleSubmitInvite = () => {
    let emails = this.state.emails.trim();
    if (emails) {
      seafileAPI.invitePeople(emails).then((res) => {

        if (res.data.failed.length > 0) {
          let inviteFailed = '';
          for (let i = 0; i < res.data.failed.length; i++) {
            inviteFailed += res.data.failed[i].error_msg
          }
          this.setState({
            errorMsg: inviteFailed,
          });
          this.props.listInvitations();
        } else {
          this.setState({
            emails: '',
          });
          this.props.onInvitePeople();
        }
      }).catch((error) => {
        let errorMsg = gettext(error.response.data.error_msg);
        this.setState({
          errorMsg: errorMsg,
        });
      });
    } else {
      this.setState({
        errorMsg: gettext('Email is required')
      });
    }
  }

  render() {
    return (
      <Modal isOpen={this.props.showInvitationsModal} toggle={this.props.toggleInvitationsModal}>
        <ModalHeader toggle={this.props.toggleInvitationsModal}>{gettext('Invite People')}</ModalHeader>
        <ModalBody>
          <label htmlFor="emails">{gettext('Email')}</label>
          <Input type="text" id="emails" placeholder="Emails, separated by ','"
                 value={this.state.emails}
                 onChange={this.handleEmailsChange}
                 onKeyDown={this.handleKeyDown}
          />
          <span className="error">{this.state.errorMsg}</span>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleInvitationsModal}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmitInvite}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const InvitePeopleDialogPropTypes = {
  toggleInvitationsModal: PropTypes.func.isRequired,
  showInvitationsModal: PropTypes.bool.isRequired,
  onInvitePeople: PropTypes.func.isRequired,
};

InvitePeopleDialog.propTypes = InvitePeopleDialogPropTypes;

export default InvitePeopleDialog;