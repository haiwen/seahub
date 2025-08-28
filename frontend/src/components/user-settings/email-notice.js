import React from 'react';
import { gettext } from '../../utils/constants';
import { userAPI } from '../../utils/user-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const {
  fileUpdatesEmailInterval,
  collaborateEmailInterval,
  enableLoginEmail,
  enablePasswordUpdateEmail,

} = window.app.pageOptions;

class EmailNotice extends React.Component {

  constructor(props) {
    super(props);

    // interval: in seconds
    this.fileUpdatesOptions = [
      { interval: 0, text: gettext('Don\'t send emails') },
      { interval: 3600, text: gettext('Per hour') },
      { interval: 14400, text: gettext('Per 4 hours') },
      { interval: 86400, text: gettext('Per day') },
      { interval: 604800, text: gettext('Per week') }
    ];

    this.collaborateOptions = [
      { interval: 0, text: gettext('Don\'t send emails') },
      { interval: 3600, text: gettext('Per hour') + ' (' + gettext('If notifications have not been read within one hour, they will be sent to your mailbox.') + ')' }
    ];

    this.passwordOption = [
      { enabled: 0, text: gettext('Don\'t send emails') },
      { enabled: 1, text: gettext('Send email after changing password') }
    ];

    this.loginOption = [
      { enabled: 0, text: gettext('Don\'t send emails') },
      { enabled: 1, text: gettext('Send an email when a new device or browser logs in for the first time') }
    ];

    this.state = {
      fileUpdatesEmailInterval: fileUpdatesEmailInterval,
      collaborateEmailInterval: collaborateEmailInterval,
      enableLoginEmail: enableLoginEmail,
      enablePasswordUpdateEmail: enablePasswordUpdateEmail
    };
  }

  inputFileUpdatesEmailIntervalChange = (e) => {
    if (e.target.checked) {
      this.setState({
        fileUpdatesEmailInterval: parseInt(e.target.value)
      });
    }
  };

  inputCollaborateEmailIntervalChange = (e) => {
    if (e.target.checked) {
      this.setState({
        collaborateEmailInterval: parseInt(e.target.value)
      });
    }
  };

  inputPasswordEmailEnabledChange = (e) => {
    if (e.target.checked) {
      this.setState({
        enablePasswordUpdateEmail: parseInt(e.target.value)
      });
    }
  };

  inputLoginEmailEnabledChange = (e) => {
    if (e.target.checked) {
      this.setState({
        enableLoginEmail: parseInt(e.target.value)
      });
    }
  };

  formSubmit = (e) => {
    e.preventDefault();
    let { fileUpdatesEmailInterval, collaborateEmailInterval, enablePasswordUpdateEmail, enableLoginEmail } = this.state;
    userAPI.updateEmailNotificationConfig(fileUpdatesEmailInterval, collaborateEmailInterval, enablePasswordUpdateEmail, enableLoginEmail).then((res) => {
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  };

  render() {
    const { fileUpdatesEmailInterval, collaborateEmailInterval, enableLoginEmail, enablePasswordUpdateEmail } = this.state;
    return (
      <div className="setting-item" id="email-notice">
        <h3 className="setting-item-heading">{gettext('Email Notification')}</h3>
        <form method="post" action="" id="set-email-notice-interval-form" onSubmit={this.formSubmit}>
          <h4 className="h6">{gettext('Notifications of file changes')}</h4>
          <p className="mb-1">{gettext('The list of added, deleted and modified files will be sent to your mailbox.')}</p>
          {this.fileUpdatesOptions.map((item, index) => {
            return (
              <div className="d-flex" key={`file-updates-${index}`}>
                <input type="radio" name="file-interval" value={item.interval} id={`file-updates-interval-option-${index + 1}`} checked={fileUpdatesEmailInterval == item.interval} onChange={this.inputFileUpdatesEmailIntervalChange} />
                <label className="m-0 ml-2" htmlFor={`file-updates-interval-option-${index + 1}`}>{item.text}</label>
              </div>
            );
          })}

          <h4 className="mt-3 h6">{gettext('Notifications of collaboration')}</h4>
          <p className="mb-1">{gettext('Whether the notifications of collaboration such as sharing library or joining group should be sent to your mailbox.')}</p>
          {this.collaborateOptions.map((item, index) => {
            return (
              <div className="d-flex align-items-start" key={`collaborate-${index}`}>
                <input type="radio" name="col-interval" value={item.interval} className="mt-1" id={`collaborate-interval-option-${index + 1}`} checked={collaborateEmailInterval == item.interval} onChange={this.inputCollaborateEmailIntervalChange} />
                <label className="m-0 ml-2" htmlFor={`collaborate-interval-option-${index + 1}`}>{item.text}</label>
              </div>
            );
          })}

          <h4 className="mt-3 h6">{gettext('Notifications of change password')}</h4>
          {this.passwordOption.map((item, index) => {
            return (
              <div className="d-flex align-items-start" key={`password-${index}`}>
                <input type="radio" name="pwd-interval" value={item.enabled} className="mt-1" id={`password-interval-option-${index + 1}`} checked={enablePasswordUpdateEmail == item.enabled} onChange={this.inputPasswordEmailEnabledChange} />
                <label className="m-0 ml-2" htmlFor={`password-interval-option-${index + 1}`}>{item.text}</label>
              </div>
            );
          })}

          <h4 className="mt-3 h6">{gettext(' Send a mail as soon as a new device or browser has signed into the account')}</h4>
          {this.loginOption.map((item, index) => {
            return (
              <div className="d-flex" key={`login-updates-${index}`}>
                <input type="radio" name="login-interval" value={item.enabled} id={`login-updates-interval-option-${index + 1}`} checked={enableLoginEmail == item.enabled} onChange={this.inputLoginEmailEnabledChange} />
                <label className="m-0 ml-2" htmlFor={`login-updates-interval-option-${index + 1}`}>{item.text}</label>
              </div>
            );
          })}
          <button type="submit" className="btn btn-outline-primary mt-4">{gettext('Submit')}</button>
        </form>
      </div>
    );
  }
}

export default EmailNotice;
