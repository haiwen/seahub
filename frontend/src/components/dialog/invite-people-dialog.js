import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Input, Button } from 'reactstrap';
import toaster from '../toast';
import Loading from '../loading';

const InvitePeopleDialogPropTypes = {
  onInvitePeople: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class InvitePeopleDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      emails: '',
      errorMsg: '',
      isSubmitting: false
    };
  }

  handleInputChange = (e) => {
    let emails = e.target.value;
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
    if (!emails) {
      this.setState({
        errorMsg: gettext('It is required.')
      });
      return false;
    }

    let emailsArray = [];
    emails = emails.split(',');
    for (let i = 0, len = emails.length; i < len; i++) {
      let email = emails[i].trim();
      if (email) {
        emailsArray.push(email);
      }
    }

    if (!emailsArray.length) {
      this.setState({
        errorMsg: gettext('Email is invalid.')
      });
      return false;
    }

    this.setState({
      isSubmitting: true
    });
    seafileAPI.invitePeople(emailsArray).then((res) => {
      this.props.toggleDialog();
      const success = res.data.success;
      if (success.length) {
        let successMsg = '';
        if (success.length == 1) {
          successMsg = gettext('Successfully invited %(email).')
            .replace('%(email)', success[0].accepter);
        } else {
          successMsg = gettext('Successfully invited %(email) and %(num) other people.')
            .replace('%(email)', success[0].accepter)
            .replace('%(num)', success.length - 1);
        }
        toaster.success(successMsg);
        this.props.onInvitePeople(success);
      }
      const failed = res.data.failed;
      if (failed.length) {
        for (let i = 0, len = failed.length; i < len; i++) {
          let failedMsg = failed[i].email + ': ' + failed[i].error_msg;
          toaster.danger(failedMsg);
        }
      }
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.props.toggleDialog();
    });
  }

  render() {
    const { isSubmitting } = this.state;
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Invite Guest')}</ModalHeader>
        <ModalBody>
          <label htmlFor="emails">{gettext('Emails')}</label>
          <Input
            type="text"
            id="emails"
            placeholder={gettext('Emails, separated by \',\'')}
            value={this.state.emails}
            onChange={this.handleInputChange}
            onKeyDown={this.handleKeyDown}
          />
          <p className="error mt-2">{this.state.errorMsg}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button className="submit-btn" color="primary" onClick={this.handleSubmitInvite} disabled={isSubmitting}>{isSubmitting ? <Loading /> : gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

InvitePeopleDialog.propTypes = InvitePeopleDialogPropTypes;

export default InvitePeopleDialog;
