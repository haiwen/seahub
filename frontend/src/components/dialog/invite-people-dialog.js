import React from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {seafileAPI} from '../../utils/seafile-api';
import {Modal, ModalHeader, ModalBody, ModalFooter, Input, Button} from 'reactstrap';
import toaster from '../toast';
import Loading from '../loading';

import '../../css/invitations.css';

class InvitePeopleDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      emails: '',
      errorMsg: '',
      loading: false,
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
      e.preventDefault();
      this.handleSubmitInvite();
    }
  }

  handleSubmitInvite = () => {
    let emails = this.state.emails.trim();
    let emailsArray = [];
    emails = emails.split(',');
    for (let i = 0; i < emails.length; i++) {
      let email = emails[i].trim();
      if (email) {
        emailsArray.push(email);
      }
    }
    if (emailsArray.length) {
      this.setState({
        loading: true
      });
      seafileAPI.invitePeople(emailsArray).then((res) => {
        this.setState({
          emails: '',
        });
        this.props.toggleInvitePeopleDialog();
        // success messages
        let successMsg = '';
        if (res.data.success.length === 1) {
          successMsg = gettext('Successfully invited %(email).')
            .replace('%(email)', res.data.success[0].accepter);
        } else if(res.data.success.length > 1) {
          successMsg = gettext('Successfully invited %(email) and %(num) other people.')
            .replace('%(email)', res.data.success[0].accepter)
            .replace('%(num)', res.data.success.length - 1);
        }
        if (successMsg) {
          toaster.success(successMsg, {duration: 2});
          this.props.onInvitePeople(res.data.success);
        }
        // failed messages
        if (res.data.failed.length) {
          for (let i = 0; i< res.data.failed.length; i++){
            let failedMsg = res.data.failed[i].email + ': ' + res.data.failed[i].error_msg;
            toaster.danger(failedMsg, {duration: 3});}
        }
      }).catch((error) => {
        this.props.toggleInvitePeopleDialog();
        if (error.response){
          toaster.danger(error.response.data.detail || gettext('Error'), {duration: 3});
        } else {
          toaster.danger(gettext('Please check the network.'), {duration: 3});
        }
      });
    } else {
      if (this.state.emails){
        this.setState({
          errorMsg: gettext('Email is invalid.')
        });
      } else {
        this.setState({
          errorMsg: gettext('It is required.')
        });
      }
    }
  }

  render() {
    const { loading } = this.state;

    return (
      <Modal isOpen={this.props.isInvitePeopleDialogOpen} toggle={this.props.toggleInvitePeopleDialog} className="invite-people-dialog">
        <ModalHeader toggle={this.props.toggleInvitePeopleDialog}>{gettext('Invite People')}</ModalHeader>
        <ModalBody>
          <label htmlFor="emails">{gettext('Emails')}</label>
          <Input
            type="text" id="emails"
            placeholder={gettext('Emails, separated by \',\'')}
            value={this.state.emails}
            onChange={this.handleEmailsChange}
            onKeyDown={this.handleKeyDown}
          />
          <span className="error">{this.state.errorMsg}</span>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleInvitePeopleDialog}>{gettext('Cancel')}</Button>
          <Button className="submit-btn" color="primary" onClick={this.handleSubmitInvite} disabled={loading}>{loading ? <Loading/> :gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const InvitePeopleDialogPropTypes = {
  toggleInvitePeopleDialog: PropTypes.func.isRequired,
  isInvitePeopleDialogOpen: PropTypes.bool.isRequired,
  onInvitePeople: PropTypes.func.isRequired,
};

InvitePeopleDialog.propTypes = InvitePeopleDialogPropTypes;

export default InvitePeopleDialog;