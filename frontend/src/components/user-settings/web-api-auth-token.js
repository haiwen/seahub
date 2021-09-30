import React from 'react';
import ModalPortal from '../modal-portal';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

class WebAPIAuthToken extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      authToken: '',
      isAuthTokenVisible: false,
    };
  }

  componentDidMount() {
    this.getAuthToken();
  }

  getAuthToken = () => {
    seafileAPI.getAuthTokenBySession().then((res) => {
      this.setState({
        authToken: res.data.token
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  createAuthToken = () => {
    seafileAPI.createAuthTokenBySession().then((res) => {
      this.setState({
        authToken: res.data.token,
        isAuthTokenVisible: false
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }

  deleteAuthToken = () => {
    seafileAPI.deleteAuthTokenBySession().then((res) => {
      this.setState({
        authToken: '',
        isAuthTokenVisible: false
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }

  toggleAuthTokenVisible = () => {
    this.setState({
      isAuthTokenVisible: !this.state.isAuthTokenVisible
    });
  }

  onIconKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  }

  render() {
    const { authToken, isAuthTokenVisible } = this.state;
    return (
      <React.Fragment>
        <div id="get-auth-token" className="setting-item">
          <h3 className="setting-item-heading">{gettext('Web API Auth Token')}</h3>
          {authToken ? (
            <React.Fragment>
              <div className="d-flex align-items-center">
                <label className="m-0 mr-2" htmlFor="token">{gettext('Token:')}</label>
                <input id="token" className="border-0 mr-1" type="text" value={isAuthTokenVisible ? authToken : '****************************************'} readOnly={true} size={Math.max(authToken.length, 10)} />
                <span tabIndex="0" role="button" aria-label={isAuthTokenVisible ? gettext('Hide') : gettext('Show')} onKeyDown={this.onIconKeyDown} onClick={this.toggleAuthTokenVisible} className={`eye-icon fas ${this.state.isAuthTokenVisible ? 'fa-eye': 'fa-eye-slash'}`}></span>
              </div>
              <button className="btn btn-outline-primary mt-2" onClick={this.deleteAuthToken}>{gettext('Delete')}</button>
            </React.Fragment>
          ) : (
            <button className="btn btn-outline-primary" onClick={this.createAuthToken}>{gettext('Generate')}</button>
          )}
        </div>
      </React.Fragment>
    );
  }
}

export default WebAPIAuthToken;
