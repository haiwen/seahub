import React from 'react';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

class WebAPIAuthToken extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      authToken: '******'
    };
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

  render() {
    const { authToken } = this.state;
    return (
      <div id="get-auth-token" className="setting-item">
        <h3 className="setting-item-heading">{gettext('Web API Auth Token')}</h3>
        <div className="d-flex align-items-center">
          <input type="text" readOnly={true} value={authToken} className="form-control mr-2 col-sm-5" />
          <button className="btn btn-outline-primary" onClick={this.getAuthToken}>{gettext('Get')}</button>
        </div>
      </div>
    );
  }
}

export default WebAPIAuthToken;
