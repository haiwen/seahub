import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form, FormGroup, Label } from 'reactstrap';
import { seafileAPI } from '../utils/seafile-api';
import { gettext } from '../utils/constants';
import { Utils } from '../utils/utils';
import toaster from './toast';

const propTypes = {
  token: PropTypes.string.isRequired,
  linkType: PropTypes.string.isRequired,
  toggleSendLink: PropTypes.func.isRequired,
  closeShareDialog: PropTypes.func.isRequired
};

class SendLink extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      emails: '',
      msg: '',
      errorMsg: '',
      btnDisabled: false,
      sending: false
    };
  }

  handleEmailsInputChange = (e) => {
    this.setState({
      emails: e.target.value
    });
  }

  handleMsgInputChange = (e) => {
    this.setState({
      msg: e.target.value
    });
  }

  sendLink = () => {
    const { emails, msg } = this.state;
    if (!emails.trim()) {
      this.setState({
        errorMsg: gettext('Please input at least an email.')
      });
      return;
    }

    this.setState({
      btnDisabled: true,
      sending: true
    });

    const { token, linkType } = this.props;
    const request = linkType == 'uploadLink' ?
      seafileAPI.sendUploadLink(token, emails.trim(), msg.trim()) :
      seafileAPI.sendShareLink(token, emails.trim(), msg.trim());
    request.then((res) => {
      this.props.closeShareDialog();
      const { success, failed } = res.data;
      if (success.length) {
        const feedbackMsg = gettext('Successfully sent to {placeholder}')
          .replace('{placeholder}', success.join(', '));
        toaster.success(feedbackMsg);
      }
      if (failed.length) {
        failed.map((item) => {
          const feedbackMsg = gettext('Failed to send to {email_placeholder}: {errorMsg_placeholder}')
            .replace('{email_placeholder}', item.email)
            .replace('{errorMsg_placeholder}', item.error_msg);
          toaster.warning(feedbackMsg);
        });
      }
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        btnDisabled: false,
        sending: false,
        errorMsg: errorMsg
      });
    });
  }

  render() {
    const { emails, msg, errorMsg, btnDisabled, sending } = this.state;
    return (
      <Form>
        <FormGroup>
          <Label htmlFor="emails" className="text-secondary font-weight-normal">{gettext('Send to:')}</Label>
          <input
            type="text"
            id="emails"
            className="form-control w-75"
            value={emails}
            onChange={this.handleEmailsInputChange}
            placeholder={gettext('Emails, separated by \',\'')}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="msg" className="text-secondary font-weight-normal">{gettext('Message (optional):')}</Label>
          <textarea
            className="form-control w-75"
            id="msg"
            value={msg}
            onChange={this.handleMsgInputChange}
          ></textarea>
        </FormGroup>
        {errorMsg && <p className="error">{errorMsg}</p>}
        <Button color="primary" onClick={this.sendLink} disabled={btnDisabled} className="mr-2">{gettext('Send')}</Button>
        <Button color="secondary" onClick={this.props.toggleSendLink}>{gettext('Cancel')}</Button>
        {sending && <p className="mt-2">{gettext('Sending...')}</p>}
      </Form>
    );
  }
}

SendLink.propTypes = propTypes;

export default SendLink;
