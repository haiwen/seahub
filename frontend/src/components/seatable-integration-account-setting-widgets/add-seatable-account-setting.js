import React, { Component } from 'react';
import { Alert, Input, FormGroup, Label, InputGroup, InputGroupText } from 'reactstrap';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import { seafileAPI } from '../../utils/seafile-api';

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
      seatable_url: currentDtableInfo?.seatable_url || 'https://dev.seatable.cn/',
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
    const { t } = this.props;
    let { base_name, seatable_url, seatable_api_token } = this.state;
    base_name = base_name.trim();
    seatable_url = seatable_url.trim();
    seatable_api_token = seatable_api_token.trim();
    let errMessage = '';
    if (!base_name) {
      errMessage = t('Base name is required');
    }
    else if (!seatable_url) {
      errMessage = t('URL is required');
    }
    else if (!seatable_api_token) {
      errMessage = t('Seatable API token is required');
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
    const { t } = this.props;
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
        errMessage: t('URL or Seatable API token is invalid'),
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
    const { t } = this.props;
    const { errMessage, stage, successMessage, base_name, seatable_url, seatable_api_token, passwordType } = this.state;
    return (
      <div className="add-account">
        <div className="add-account-header d-flex align-items-center justify-content-between">
          <span>
            <span className="back-btn d-inline-flex align-items-center justify-content-center" onClick={this.props.changeStatus}>
              <i className="link-icon icon-left sf3-font sf3-font-arrow" style={{transform: 'rotate(180deg)', color: '#999'}}></i>
            </span>
            <span className="add-account-header-text">{t('Add Seatable Integration')}</span>
          </span>
          <button
            onClick={stage === 'toCheck'? this.testSeatableAPIToken : this.addSeatableAccountSetting}
            type="button"
            className="btn btn-secondary add-account-btn"
          >{stage === 'toCheck' ? t('Check') : t('Submit')}</button>
        </div>
        <div className="base-account">
          <div className="account-name-desc">
            <FormGroup>
              <Label>{t('Base name')}</Label>
              <Input value={base_name} onChange={this.onChangeBaseName}/>
            </FormGroup>
            <FormGroup>
              <Label>{t('Seatable server URL')}</Label>
              <Input value={seatable_url} onChange={this.onChangeSeatableUrl}/>
            </FormGroup>
            <FormGroup className="base-account-password">
              <Label>{t('Seatable API token')}</Label>
              <InputGroup>
                <Input value={seatable_api_token} type={passwordType} onChange={this.onChangeSeatableApiToken}/>
                <InputGroupText>
                  <i className={`fas ${passwordType === 'password' ? 'fa-eye-slash' : 'fa-eye'} cursor-pointer`} onClick={this.togglePasswordShow} />
                </InputGroupText>
              </InputGroup>
            </FormGroup>
          </div>
          {errMessage && <Alert color="danger">{errMessage}</Alert>}
          {successMessage && <Alert color="success">
            <span className="dtable-font dtable-icon-check-circle mr-2"></span>
            {t('Successfully connected to Seatable')}
          </Alert>}
        </div>
      </div>
    );
  }
}

export default withTranslation('dtable')(AddSeatableAccountSetting);
