import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import moment from 'moment';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, InputGroupText, Alert, FormText } from 'reactstrap';
import { gettext, shareLinkForceUsePassword, shareLinkPasswordMinLength, shareLinkPasswordStrengthLevel, canSendShareLinkEmail, uploadLinkExpireDaysMin, uploadLinkExpireDaysMax, uploadLinkExpireDaysDefault } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import UploadLink from '../../models/upload-link';
import toaster from '../toast';
import SendLink from '../send-link';
import DateTimePicker from '../date-and-time-picker';
import SharedLink from '../shared-link';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
};

const inputWidth = Utils.isDesktop() ? 250 : 210;

class GenerateUploadLink extends React.Component {
  constructor(props) {
    super(props);

    this.isExpireDaysNoLimit = (uploadLinkExpireDaysMin === 0 && uploadLinkExpireDaysMax === 0 && uploadLinkExpireDaysDefault == 0);
    this.defaultExpireDays = this.isExpireDaysNoLimit ? '' : uploadLinkExpireDaysDefault;

    let expirationLimitTip = '';
    if (uploadLinkExpireDaysMin !== 0 && uploadLinkExpireDaysMax !== 0) {
      expirationLimitTip = gettext('{minDays_placeholder} - {maxDays_placeholder} days')
        .replace('{minDays_placeholder}', uploadLinkExpireDaysMin)
        .replace('{maxDays_placeholder}', uploadLinkExpireDaysMax);
    } else if (uploadLinkExpireDaysMin !== 0 && uploadLinkExpireDaysMax === 0) {
      expirationLimitTip = gettext('Greater than or equal to {minDays_placeholder} days')
        .replace('{minDays_placeholder}', uploadLinkExpireDaysMin);
    } else if (uploadLinkExpireDaysMin === 0 && uploadLinkExpireDaysMax !== 0) {
      expirationLimitTip = gettext('Less than or equal to {maxDays_placeholder} days')
        .replace('{maxDays_placeholder}', uploadLinkExpireDaysMax);
    }
    this.expirationLimitTip = expirationLimitTip;

    this.state = {
      showPasswordInput: shareLinkForceUsePassword ? true : false,
      passwordVisible: false,
      password: '',
      passwordnew: '',
      storedPasswordVisible: false,
      sharedUploadInfo: null,
      isSendLinkShown: false,
      isExpireChecked: !this.isExpireDaysNoLimit,
      setExp: 'by-days',
      expireDays: this.defaultExpireDays,
      expDate: null
    };
  }

  componentDidMount() {
    this.getUploadLink();
  }

  getUploadLink = () => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.getUploadLink(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        let sharedUploadInfo = new UploadLink(res.data[0]);
        this.setState({sharedUploadInfo: sharedUploadInfo});
      }
    }).catch((err) => {
      let errMsg = Utils.getErrorMsg(err, true);
      if (!err.response || err.response.status !== 403) {
        toaster.danger(errMsg);
      }
      this.props.closeShareDialog();
    });
  }

  addPassword = () => {
    this.setState({
      showPasswordInput: !this.state.showPasswordInput,
      password: '',
      passwordnew: '',
      errorInfo: ''
    });
  }

  togglePasswordVisible = () => {
    this.setState({
      passwordVisible: !this.state.passwordVisible
    });
  }

  generatePassword = () => {
    let val = Utils.generatePassword(shareLinkPasswordMinLength);
    this.setState({
      password: val,
      passwordnew: val
    });
  }

  inputPassword = (e) => {
    this.setState({
      password: e.target.value
    });
  }

  inputPasswordNew = (e) => {
    this.setState({
      passwordnew: e.target.value
    });
  }

  toggleStoredPasswordVisible = () => {
    this.setState({
      storedPasswordVisible: !this.state.storedPasswordVisible
    });
  }

  generateUploadLink = () => {
    let isValid = this.validateParamsInput();
    if (isValid) {
      this.setState({errorInfo: ''});

      let { itemPath, repoID } = this.props;
      let { password, isExpireChecked, setExp, expireDays, expDate } = this.state;

      let expirationTime = '';
      if (isExpireChecked) {
        if (setExp == 'by-days') {
          expirationTime = moment().add(parseInt(expireDays), 'days').format();
        } else {
          expirationTime = expDate.format();
        }
      }

      seafileAPI.createUploadLink(repoID, itemPath, password, expirationTime).then((res) => {
        let sharedUploadInfo = new UploadLink(res.data);
        this.setState({sharedUploadInfo: sharedUploadInfo});
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  validateParamsInput = () => {
    let { showPasswordInput, password, passwordnew, isExpireChecked, setExp, expireDays, expDate } = this.state;

    // check password params
    if (showPasswordInput) {
      if (password.length === 0) {
        this.setState({errorInfo: gettext('Please enter a password.')});
        return false;
      }
      if (password.length < shareLinkPasswordMinLength) {
        this.setState({errorInfo: gettext('The password is too short.')});
        return false;
      }
      if (password !== passwordnew) {
        this.setState({errorInfo: gettext('Passwords don\'t match')});
        return false;
      }
      if (Utils.getStrengthLevel(password) < shareLinkPasswordStrengthLevel) {
        this.setState({errorInfo: gettext('The password is too weak. It should include at least {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols.').replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel)});
        return false;
      }
    }

    if (isExpireChecked) {
      if (setExp == 'by-date') {
        if (!expDate) {
          this.setState({errorInfo: gettext('Please select an expiration time')});
          return false;
        }
        return true;
      }

      let reg = /^\d+$/;
      if (!expireDays) {
        this.setState({errorInfo: gettext('Please enter days')});
        return false;
      }
      if (!reg.test(expireDays)) {
        this.setState({errorInfo: gettext('Please enter a non-negative integer')});
        return false;
      }
      this.setState({expireDays: parseInt(expireDays)});
    }
    return true;
  }

  onExpireChecked = (e) => {
    this.setState({isExpireChecked: e.target.checked});
  }

 setExp = (e) => {
   this.setState({
     setExp: e.target.value
   });
 }

  disabledDate = (current) => {
    if (!current) {
      // allow empty select
      return false;
    }

    if (this.isExpireDaysNoLimit) {
      return current.isBefore(moment(), 'day');
    }

    const startDay = moment().add(uploadLinkExpireDaysMin, 'days');
    const endDay = moment().add(uploadLinkExpireDaysMax, 'days');
    if (uploadLinkExpireDaysMin !== 0 && uploadLinkExpireDaysMax !== 0) {
      return current.isBefore(startDay, 'day') || current.isAfter(endDay, 'day');
    } else if (uploadLinkExpireDaysMin !== 0 && uploadLinkExpireDaysMax === 0) {
      return current.isBefore(startDay, 'day');
    } else if (uploadLinkExpireDaysMin === 0 && uploadLinkExpireDaysMax !== 0) {
      return current.isBefore(moment(), 'day') || current.isAfter(endDay, 'day');
    }
  }

  onExpDateChanged = (value) => {
    this.setState({
      expDate: value
    });
  }

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({expireDays: day});
  }

  onCopyUploadLink = () => {
    let uploadLink = this.state.sharedUploadInfo.link;
    copy(uploadLink);
    toaster.success(gettext('Upload link is copied to the clipboard.'));
    this.props.closeShareDialog();
  }

  deleteUploadLink = () => {
    let sharedUploadInfo = this.state.sharedUploadInfo;
    seafileAPI.deleteUploadLink(sharedUploadInfo.token).then(() => {
      this.setState({
        showPasswordInput: shareLinkForceUsePassword ? true : false,
        expireDays: this.defaultExpireDays,
        isExpireChecked: !this.isExpireDaysNoLimit,
        password: '',
        passwordnew: '',
        sharedUploadInfo: null,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleSendLink = () => {
    this.setState({
      isSendLinkShown: !this.state.isSendLinkShown
    });
  }

  render() {

    const { isSendLinkShown } = this.state;

    let passwordLengthTip = gettext('(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)');
    passwordLengthTip = passwordLengthTip.replace('{passwordMinLength}', shareLinkPasswordMinLength)
                                         .replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel);

    if (this.state.sharedUploadInfo) {
      let sharedUploadInfo = this.state.sharedUploadInfo;
      return (
        <div>
          <Form className="mb-4">
            <FormGroup>
              <dt className="text-secondary font-weight-normal">{gettext('Upload Link:')}</dt>
              <dd>
                <SharedLink
                  link={sharedUploadInfo.link}
                  linkExpired={sharedUploadInfo.is_expired}
                  copyLink={this.onCopyUploadLink}
                />
              </dd>
            </FormGroup>

            {sharedUploadInfo.password && (
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Password:')}</dt>
                <dd className="d-flex">
                  <div className="d-flex align-items-center">
                    <input id="stored-password" className="border-0 mr-1" type="text" value={this.state.storedPasswordVisible ? sharedUploadInfo.password : '****************************************'} readOnly={true} size={Math.max(sharedUploadInfo.password.length, 10)} />
                    <span tabIndex="0" role="button" aria-label={this.state.storedPasswordVisible ? gettext('Hide') : gettext('Show')} onKeyDown={this.onIconKeyDown} onClick={this.toggleStoredPasswordVisible} className={`eye-icon fas ${this.state.storedPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></span>
                  </div>
                </dd>
              </FormGroup>
            )}

            {sharedUploadInfo.expire_date && (
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Expiration Date:')}</dt>
                <dd>{moment(sharedUploadInfo.expire_date).format('YYYY-MM-DD HH:mm:ss')}</dd>
              </FormGroup>
            )}
          </Form>
          {canSendShareLinkEmail && !isSendLinkShown && <Button onClick={this.toggleSendLink} className="mr-2">{gettext('Send')}</Button>}
          {!isSendLinkShown && <Button onClick={this.deleteUploadLink}>{gettext('Delete')}</Button>}
          {isSendLinkShown &&
          <SendLink
            linkType='uploadLink'
            token={sharedUploadInfo.token}
            toggleSendLink={this.toggleSendLink}
            closeShareDialog={this.props.closeShareDialog}
          />
          }
        </div>
      );
    }
    return (
      <Form className="generate-upload-link">
        <FormGroup check>
          <Label check>
            {shareLinkForceUsePassword ? (
            <Label check>
              <Input type="checkbox" checked readOnly disabled />
              <span>{gettext('Add password protection')}</span>
            </Label>
            ) : (
            <Label check>
              <Input type="checkbox" onChange={this.addPassword} />
              <span>{gettext('Add password protection')}</span>
            </Label>
            )}
          </Label>
          {this.state.showPasswordInput &&
          <div className="ml-4">
            <FormGroup>
              <Label for="passwd">{gettext('Password')}</Label>
              <span className="tip">{passwordLengthTip}</span>
              <InputGroup style={{width: inputWidth}}>
                <Input id="passwd" type={this.state.passwordVisible ? 'text':'password'} value={this.state.password || ''} onChange={this.inputPassword} />
                <InputGroupAddon addonType="append">
                  <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.passwordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                  <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                </InputGroupAddon>
              </InputGroup>
            </FormGroup>
            <FormGroup>
              <Label for="passwd-again">{gettext('Password again')}</Label>
              <Input id="passwd-again" style={{width: inputWidth}} type={this.state.passwordVisible ? 'text' : 'password'} value={this.state.passwordnew || ''} onChange={this.inputPasswordNew} />
            </FormGroup>
          </div>
          }
        </FormGroup>
        <FormGroup check>
          <Label check>
            {this.isExpireDaysNoLimit ? (
              <Input type="checkbox" onChange={this.onExpireChecked} />
            ) : (
              <Input type="checkbox" checked readOnly disabled />
            )}
            <span>{gettext('Add auto expiration')}</span>
          </Label>
          {this.state.isExpireChecked &&
          <div className="ml-4">
            <FormGroup check>
              <Label check>
                <Input type="radio" name="set-exp" value="by-days" checked={this.state.setExp == 'by-days'} onChange={this.setExp} className="mr-1" />
                <span>{gettext('Expiration days')}</span>
              </Label>
              {this.state.setExp == 'by-days' && (
                <Fragment>
                  <InputGroup style={{width: inputWidth}}>
                    <Input type="text" value={this.state.expireDays} onChange={this.onExpireDaysChanged} />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>{gettext('days')}</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {!this.state.isExpireDaysNoLimit && (
                    <FormText color="muted">{this.expirationLimitTip}</FormText>
                  )}
                </Fragment>
              )}
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input type="radio" name="set-exp" value="by-date" checked={this.state.setExp == 'by-date'} onChange={this.setExp} className="mr-1" />
                <span>{gettext('Expiration time')}</span>
              </Label>
              {this.state.setExp == 'by-date' && (
                <DateTimePicker
                  inputWidth={inputWidth}
                  disabledDate={this.disabledDate}
                  value={this.state.expDate}
                  onChange={this.onExpDateChanged}
                />
              )}
            </FormGroup>
          </div>
          }
        </FormGroup>
        {this.state.errorInfo && <Alert color="danger" className="mt-2">{this.state.errorInfo}</Alert>}
        <Button className="generate-link-btn" onClick={this.generateUploadLink}>{gettext('Generate')}</Button>
      </Form>
    );
  }
}

GenerateUploadLink.propTypes = propTypes;

export default GenerateUploadLink;
