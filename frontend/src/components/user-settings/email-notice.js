import React from 'react';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';

const {
  initialEmailNotificationInterval
} = window.app.pageOptions;

class EmailNotice extends React.Component {

  constructor(props) {
    super(props);

    // interval: in seconds
    this.intervalOptions = [
      {interval: 0, text: gettext('Don\'t send emails')},
      {interval: 3600, text: gettext('Per hour')},
      {interval: 14400, text: gettext('Per 4 hours')},
      {interval: 86400, text: gettext('Per day')},
      {interval: 604800, text: gettext('Per week')}
    ];

    this.state = {
      currentInterval: initialEmailNotificationInterval
    };
  }

  inputChange = (e) => {
    if (e.target.checked) {
      this.setState({
        currentInterval: e.target.value
      });
    }
  }

  formSubmit = (e) => {
    e.preventDefault();
    seafileAPI.updateEmailNotificationInterval(this.state.currentInterval).then((res) => {
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = ''; 
      if (error.response) {
        errorMsg = error.response.data.error_msg || gettext('Error');
      } else {
        errorMsg = gettext('Please check the network.');
      }   
      toaster.danger(errorMsg);
    });
  }

  render() {
    const { currentInterval } = this.state;
    return (
      <div className="setting-item" id="email-notice">
        <h3 className="setting-item-heading">{gettext('Email Notification of File Changes')}</h3>
        <form method="post" action="" id="set-email-notice-interval-form" onSubmit={this.formSubmit}>
          {this.intervalOptions.map((item, index) => {
            return (
              <React.Fragment key={index}>
                <input type="radio" name="interval" value={item.interval} className="align-middle" id={`interval-option${index + 1}`} checked={currentInterval == item.interval} onChange={this.inputChange} /> 
                <label className="align-middle m-0 ml-2" htmlFor={`interval-option${index + 1}`}>{item.text}</label>
                <br />
              </React.Fragment>
            );
          })}
          <button type="submit" className="btn btn-secondary mt-2">{gettext('Submit')}</button>
        </form>
      </div>
    );
  }
}

export default EmailNotice; 
