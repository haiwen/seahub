import React from 'react';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const {
  fileUpdatesEmailInterval,
  collaborateEmailInterval
} = window.app.pageOptions;

class EmailNotice extends React.Component {

  constructor(props) {
    super(props);

    // interval: in seconds
    this.fileUpdatesOptions = [
      {interval: 0, text: gettext('Don\'t send emails')},
      {interval: 3600, text: gettext('Per hour')},
      {interval: 14400, text: gettext('Per 4 hours')},
      {interval: 86400, text: gettext('Per day')},
      {interval: 604800, text: gettext('Per week')}
    ];

    this.collaborateOptions = [
      {interval: 0, text: gettext('Don\'t send emails')},
      {interval: 3600, text: gettext('Per hour') + ' (' + gettext('If notifications have not been read within one hour, they will be sent to your mailbox.') + ')'}
    ];

    this.state = {
      fileUpdatesEmailInterval: fileUpdatesEmailInterval,
      collaborateEmailInterval: collaborateEmailInterval
    };
  }

  inputFileUpdatesEmailIntervalChange = (e) => {
    if (e.target.checked) {
      this.setState({
        fileUpdatesEmailInterval: parseInt(e.target.value)
      });
    }
  }

  inputCollaborateEmailIntervalChange = (e) => {
    if (e.target.checked) {
      this.setState({
        collaborateEmailInterval: parseInt(e.target.value)
      });
    }
  }

  formSubmit = (e) => {
    e.preventDefault();
    let { fileUpdatesEmailInterval, collaborateEmailInterval } = this.state;
    seafileAPI.updateEmailNotificationInterval(fileUpdatesEmailInterval, collaborateEmailInterval).then((res) => {
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }

  render() {
    const { fileUpdatesEmailInterval, collaborateEmailInterval } = this.state;
    return (
      <div className="setting-item" id="email-notice">
        <h3 className="setting-item-heading">{gettext('Email Notification')}</h3>
        <h6 className="">{gettext('Notifications of file changes')}</h6>
        <p className="mb-1">{gettext('The list of added, deleted and modified files will be sent to your mailbox.')}</p>
        <form method="post" action="" id="set-email-notice-interval-form" onSubmit={this.formSubmit}>
          {this.fileUpdatesOptions.map((item, index) => {
            return (
              <React.Fragment key={`file-updates-${index}`}>
                <input type="radio" name="interval" value={item.interval} className="align-middle" id={`file-updates-interval-option${index + 1}`} checked={fileUpdatesEmailInterval == item.interval} onChange={this.inputFileUpdatesEmailIntervalChange} />
                <label className="align-middle m-0 ml-2" htmlFor={`interval-option${index + 1}`}>{item.text}</label>
                <br />
              </React.Fragment>
            );
          })}
        </form>

        <h6 className="mt-4">{gettext('Notifications of collaboration')}</h6>
        <p className="mb-1">{gettext('Whether the notifications of collaboration such as sharing library or joining group should be sent to your mailbox.')}</p>
        <form method="post" action="" id="set-email-notice-interval-form" onSubmit={this.formSubmit}>
          {this.collaborateOptions.map((item, index) => {
            return (
              <React.Fragment key={`collaborate-${index}`}>
                <input type="radio" name="interval" value={item.interval} className="align-middle" id={`collaborate-interval-option${index + 1}`} checked={collaborateEmailInterval == item.interval} onChange={this.inputCollaborateEmailIntervalChange} />
                <label className="align-middle m-0 ml-2" htmlFor={`interval-option${index + 1}`}>{item.text}</label>
                <br />
              </React.Fragment>
            );
          })}
        </form>
        <button type="submit" className="btn btn-outline-primary mt-2" onClick={this.formSubmit}>{gettext('Submit')}</button>
      </div>
    );
  }
}

export default EmailNotice;
