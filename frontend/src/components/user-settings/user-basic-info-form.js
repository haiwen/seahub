import React from 'react';
import { gettext } from '../../utils/constants';

const {
  nameLabel,
  enableUpdateUserInfo,
  enableUserSetContactEmail
} = window.app.pageOptions;

class UserBasicInfoForm extends React.Component {

  constructor(props) {
    super(props);
    const {
      contact_email,
      login_id,
      name
    } = this.props.userInfo;
    this.state = {
      contactEmail: contact_email,
      loginID: login_id,
      name: name
    };
  }

  handleNameInputChange = (e) => {
    this.setState({
      name: e.target.value
    });
  }

  handleContactEmailInputChange = (e) => {
    this.setState({
      contactEmail: e.target.value
    });
  }

  handleSubmit = (e) => {
    e.preventDefault();
    let data = {
      name: this.state.name
    };
    if (enableUserSetContactEmail) {
      data.contact_email = this.state.contactEmail;
    }
    this.props.updateUserInfo(data);
  }

  render() {
    const {
      contactEmail,
      loginID,
      name
    } = this.state;

    return (
      <form action="" method="post" onSubmit={this.handleSubmit}>

        <div className="form-group row">
          <label className="col-sm-1 col-form-label" htmlFor="name">{nameLabel}</label>
          <div className="col-sm-5">
            <input className="form-control" id="name" type="text" name="nickname" value={name} disabled={!enableUpdateUserInfo} onChange={this.handleNameInputChange} />
          </div>
        </div>

        {loginID && (
          <div className="form-group row">
            <label className="col-sm-1 col-form-label" htmlFor="user-name">{gettext('Username:')}</label>
            <div className="col-sm-5">
              <input className="form-control" id="user-name" type="text" name="username" value={loginID} disabled={true} readOnly={true} />
            </div>
            <p className="col-sm-5 m-0 input-tip">{gettext('You can use this field at login.')}</p>
          </div>
        )}

        {(contactEmail || enableUserSetContactEmail) && (
          <div className="form-group row">
            <label className="col-sm-1 col-form-label" htmlFor="contact-email">{gettext('Contact Email:')}</label>
            <div className="col-sm-5">
              <input className="form-control" id="contact-email" type="text" name="contact_email" value={contactEmail} disabled={!enableUserSetContactEmail} readOnly={!enableUserSetContactEmail} onChange={this.handleContactEmailInputChange} />
            </div>
            <p className="col-sm-5 m-0 input-tip">{gettext('Your notifications will be sent to this email.')}</p>
          </div>
        )}

        <button type="submit" className="btn btn-outline-primary offset-sm-1" disabled={!enableUpdateUserInfo}>{gettext('Submit')}</button>
      </form>
    );
  }
}

export default UserBasicInfoForm;
