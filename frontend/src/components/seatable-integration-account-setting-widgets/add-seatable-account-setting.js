import React, { Component } from 'react';
import { Alert, Input, FormGroup, Label, InputGroup, InputGroupText } from 'reactstrap';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';

class AddSeatableAccountSetting extends Component {

  static propTypes = {
    t: PropTypes.func,
    changeStatus: PropTypes.func,
    onSubmit: PropTypes.func,
    currentDtableInfo: PropTypes.object,
    addSeatableAccountSetting: PropTypes.func,
  };

  constructor(props) {
    super(props);
    const { currentDtableInfo } = props;
    this.state = {
      errMessage: '',
      base_name: currentDtableInfo?.base_name || '',
      seatable_url: currentDtableInfo?.seatable_url || '',
      seatable_api_token: currentDtableInfo?.base_api_token || '',
      successMessage: null,
      stage: 'toCheck',  // toCheck: need to check -> toSubmit: need to submit
      passwordType: 'password'
    };
  }

  onChangeBaseName = (event) => {
    let value = event.target.value;
    if (value === this.state.base_name) {
      return;
    }
    this.setState({
      base_name: value,
      errMessage: '',
    });
  };

  onChangeSeatableUrl = (event) => {
    let value = event.target.value;
    if (value === this.state.seatable_url) {
      return;
    }
    this.setState({
      seatable_url: value,
      successMessage: null,
      stage: 'toCheck',
      errMessage: '',
    });
  };

  onChangeSeatableApiToken = (event) => {
    let value = event.target.value;
    if (value === this.state.seatable_api_token) {
      return;
    }
    this.setState({
      seatable_api_token: value,
      successMessage: null,
      stage: 'toCheck',
      errMessage: '',
    });
  };

  addSeatableAccountSetting = () => {
    let { base_name, seatable_url, seatable_api_token } = this.state;
    base_name = base_name.trim();
    seatable_url = seatable_url.trim();
    seatable_api_token = seatable_api_token.trim();
    let errMessage = '';
    if (!base_name) {
      errMessage = gettext('SeaTable base name is required');
    }
    else if (!seatable_url) {
      errMessage = gettext('SeaTable server URL is required');
    }
    else if (!seatable_api_token) {
      errMessage = gettext('SeaTable API token is required');
    }

    this.setState({errMessage});
    if (errMessage) return;
    let detail = {
      base_name,
      seatable_url,
      seatable_api_token
    };
    this.props.onSubmit(detail, 'seatable_account_manage');
  };

  testSeatableAPIToken = async () => {
    const { seatable_url, seatable_api_token } = this.state;
    seafileAPI.req.defaults.headers.Authorization = `Token ${seatable_api_token}`;
    const [res, err] = await seafileAPI.req.get(`${seatable_url}api/v2.1/dtable/app-access-token/`).then(res => [res, null]).catch((err) => [null, err]);
    if (res) {
      this.setState({
        successMessage: res.data,
        stage: 'toSubmit',
      });
    }
    if (err) {
      this.setState({
        errMessage: gettext('URL or SeaTable API token is invalid'),
      });
    }
  };

  togglePasswordShow = () => {
    if (this.state.passwordType === 'password') {
      this.setState({passwordType: 'text'});
    } else {
      this.setState({passwordType: 'password'});
    }
  };

  render() {
    const { errMessage, stage, successMessage, base_name, seatable_url, seatable_api_token, passwordType } = this.state;
    return (
      <div className="add-account">
        <div className="add-account-header d-flex align-items-center justify-content-between">
          <span>
            <span className="back-btn d-inline-flex align-items-center justify-content-center" onClick={this.props.changeStatus}>
              <i className="link-icon icon-left sf3-font sf3-font-arrow" style={{transform: 'rotate(180deg)', color: '#999'}}></i>
            </span>
            <span className="add-account-header-text">{gettext('Add SeaTable Integration')}</span>
          </span>
          <button
            onClick={stage === 'toCheck'? this.testSeatableAPIToken : this.addSeatableAccountSetting}
            type="button"
            className="btn btn-secondary add-account-btn"
          >{stage === 'toCheck' ? gettext('Check') : gettext('Submit')}</button>
        </div>
        <div className="base-account">
          <div className="account-name-desc">
            <FormGroup>
              <Label>{gettext('SeaTable base name')}</Label>
              <Input value={base_name} onChange={this.onChangeBaseName}/>
            </FormGroup>
            <FormGroup>
              <Label>{gettext('SeaTable server URL')}</Label>
              <Input value={seatable_url} onChange={this.onChangeSeatableUrl}/>
            </FormGroup>
            <FormGroup className="base-account-password">
              <Label>{gettext('SeaTable API token')}</Label>
              <InputGroup>
                <Input value={seatable_api_token} type={passwordType} onChange={this.onChangeSeatableApiToken}/>
                <InputGroupText>
                  <i className={`fas ${passwordType === 'password' ? 'fa-eye-slash' : 'fa-eye'} cursor-pointer`} onClick={this.togglePasswordShow} />
                </InputGroupText>
              </InputGroup>
            </FormGroup>
          </div>
          {errMessage && <Alert color="danger">{errMessage}</Alert>}
          {successMessage && (
            <Alert color="success">
              <span className="dtable-font dtable-icon-check-circle mr-2"></span>
              {gettext('Successfully connected to SeaTable')}
            </Alert>
          )}
        </div>
      </div>
    );
  }
}

export default AddSeatableAccountSetting;
