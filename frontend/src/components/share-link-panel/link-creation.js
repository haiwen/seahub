import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, Alert } from 'reactstrap';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, shareLinkForceUsePassword, shareLinkPasswordMinLength, shareLinkPasswordStrengthLevel } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import SetLinkExpiration from '../set-link-expiration';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string,
  type: PropTypes.string.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  currentPermission: PropTypes.string.isRequired,
  updateAfterCreation: PropTypes.func.isRequired,
  setMode: PropTypes.func.isRequired,
};

const inputWidth = Utils.isDesktop() ? 250 : 210;

class LinkCreation extends React.Component {

  constructor(props) {
    super(props);

    this.isExpireDaysNoLimit = (shareLinkExpireDaysMin === 0 && shareLinkExpireDaysMax === 0 && shareLinkExpireDaysDefault == 0);
    this.defaultExpireDays = this.isExpireDaysNoLimit ? '' : shareLinkExpireDaysDefault;

    this.state = {
      linkAmount: '',
      isShowPasswordInput: shareLinkForceUsePassword ? true : false,
      isPasswordVisible: false,
      isExpireChecked: !this.isExpireDaysNoLimit,
      expType: 'by-days',
      expireDays: this.defaultExpireDays,
      expDate: null,
      password: '',
      passwdnew: '',
      errorInfo: '',
      currentPermission: props.currentPermission
    };
  }

  setExpType = (e) => {
    this.setState({
      expType: e.target.value
    });
  }

  onExpDateChanged = (value) => {
    this.setState({
      expDate: value
    });
  }

  onPasswordInputChecked = () => {
    this.setState({
      isShowPasswordInput: !this.state.isShowPasswordInput,
      password: '',
      passwdnew: '',
      errorInfo: ''
    });
  }

  togglePasswordVisible = () => {
    this.setState({
      isPasswordVisible: !this.state.isPasswordVisible
    });
  }

  generatePassword = () => {
    let val = Utils.generatePassword(shareLinkPasswordMinLength);
    this.setState({
      password: val,
      passwdnew: val
    });
  }

  inputPassword = (e) => {
    let passwd = e.target.value.trim();
    this.setState({password: passwd});
  }

  inputPasswordNew = (e) => {
    let passwd = e.target.value.trim();
    this.setState({passwdnew: passwd});
  }

  setPermission = (e) => {
    this.setState({currentPermission: e.target.value});
  }

  generateShareLink = () => {
    let isValid = this.validateParamsInput();
    if (isValid) {
      this.setState({errorInfo: ''});
      let { type, itemPath, repoID } = this.props;
      let { linkAmount, isShowPasswordInput, password, isExpireChecked, expType, expireDays, expDate } = this.state;
      let permissions;
      if (isPro) {
        const permissionDetails = Utils.getShareLinkPermissionObject(this.state.currentPermission).permissionDetails;
        permissions = JSON.stringify(permissionDetails);
      }
      let expirationTime = '';
      if (isExpireChecked) {
        if (expType == 'by-days') {
          expirationTime = moment().add(parseInt(expireDays), 'days').format();
        } else {
          expirationTime = expDate.format();
        }
      }

      let request;
      if (type == 'batch') {
        const autoGeneratePassword = shareLinkForceUsePassword || isShowPasswordInput;
        request = seafileAPI.batchCreateMultiShareLink(repoID, itemPath, linkAmount, autoGeneratePassword, expirationTime, permissions);
      } else {
        request = seafileAPI.createMultiShareLink(repoID, itemPath, password, expirationTime, permissions);
      }

      request.then((res) => {
        if (type == 'batch') {
          const newLinks = res.data.map(item => new ShareLink(item));
          this.props.updateAfterCreation(newLinks);
        } else {
          const newLink = new ShareLink(res.data);
          this.props.updateAfterCreation(newLink);
        }
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  onExpireChecked = (e) => {
    this.setState({isExpireChecked: e.target.checked});
  }

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({expireDays: day});
  }

  validateParamsInput = () => {
    const { type } = this.props;
    let { linkAmount, isShowPasswordInput, password, passwdnew, isExpireChecked, expType, expireDays, expDate } = this.state;

    if (type == 'batch') {
      if (!Number.isInteger(parseInt(linkAmount)) || parseInt(linkAmount) <= 1) {
        this.setState({errorInfo: gettext('Please enter an integer bigger than 1 as number of links.')});
        return false;
      }
    }

    if (type == 'single' && isShowPasswordInput) {
      if (password.length === 0) {
        this.setState({errorInfo: gettext('Please enter a password.')});
        return false;
      }
      if (password.length < shareLinkPasswordMinLength) {
        this.setState({errorInfo: gettext('The password is too short.')});
        return false;
      }
      if (password !== passwdnew) {
        this.setState({errorInfo: gettext('Passwords don\'t match')});
        return false;
      }
      if (Utils.getStrengthLevel(password) < shareLinkPasswordStrengthLevel) {
        this.setState({errorInfo: gettext('The password is too weak. It should include at least {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols.').replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel)});
        return false;
      }
    }

    if (isExpireChecked) {
      if (expType == 'by-date') {
        if (!expDate) {
          this.setState({errorInfo: gettext('Please select an expiration time')});
          return false;
        }
        return true;
      }

      // by days
      let reg = /^\d+$/;
      if (!expireDays) {
        this.setState({errorInfo: gettext('Please enter days')});
        return false;
      }
      if (!reg.test(expireDays)) {
        this.setState({errorInfo: gettext('Please enter a non-negative integer')});
        return false;
      }

      expireDays = parseInt(expireDays);
      let minDays = shareLinkExpireDaysMin;
      let maxDays = shareLinkExpireDaysMax;

      if (minDays !== 0 && maxDays == 0) {
        if (expireDays < minDays) {
          this.setState({errorInfo: 'Please enter valid days'});
          return false;
        }
      }

      if (minDays === 0 && maxDays !== 0 ) {
        if (expireDays > maxDays) {
          this.setState({errorInfo: 'Please enter valid days'});
          return false;
        }
      }

      if (minDays !== 0 && maxDays !== 0) {
        if (expireDays < minDays || expireDays > maxDays) {
          this.setState({errorInfo: 'Please enter valid days'});
          return false;
        }
      }

      this.setState({expireDays: expireDays});
    }

    return true;
  }

  onLinkAmountChange = (e) => {
    this.setState({
      linkAmount: e.target.value
    });
  }

  goBack = () => {
    this.props.setMode('');
  }

  render() {
    const { userPerm, type, permissionOptions  } = this.props;
    const { isCustomPermission } = Utils.getUserPermission(userPerm);

    return (
      <Fragment>
        <div className="d-flex align-items-center pb-2 border-bottom">
          <h6 className="font-weight-normal m-0">
            <button className="fa fa-arrow-left back-icon border-0 bg-transparent text-secondary p-0 mr-2" onClick={this.goBack} title={gettext('Back')} aria-label={gettext('Back')}></button>
            {type == 'batch' ? gettext('Generate links in batch') : gettext('Generate Link')}</h6>
        </div>
        <Form className="pt-4">
          {type == 'batch' && (
            <FormGroup>
              <Label for="link-number" className="p-0">{gettext('Number of links')}</Label>
              <Input type="number" id="link-number" value={this.state.linkAmount} onChange={this.onLinkAmountChange} style={{width: inputWidth}} />
            </FormGroup>
          )}
          <FormGroup check>
            {shareLinkForceUsePassword ? (
              <Label check>
                <Input type="checkbox" checked readOnly disabled />
                <span>{gettext('Add password protection')}</span>
              </Label>
            ) : (
              <Label check>
                <Input type="checkbox" checked={this.state.isShowPasswordInput} onChange={this.onPasswordInputChecked} />
                <span>{gettext('Add password protection')}</span>
              </Label>
            )}
            {type != 'batch' && this.state.isShowPasswordInput &&
              <div className="ml-4">
                <FormGroup>
                  <Label for="passwd">{gettext('Password')}</Label>
                  <span className="tip">{gettext('(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)').replace('{passwordMinLength}', shareLinkPasswordMinLength).replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel)}</span>
                  <InputGroup style={{width: inputWidth}}>
                    <Input id="passwd" type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.password || ''} onChange={this.inputPassword} />
                    <InputGroupAddon addonType="append">
                      <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                      <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                    </InputGroupAddon>
                  </InputGroup>
                </FormGroup>
                <FormGroup>
                  <Label for="passwd-again">{gettext('Password again')}</Label>
                  <Input id="passwd-again" style={{width: inputWidth}} type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.passwdnew || ''} onChange={this.inputPasswordNew} />
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
                <SetLinkExpiration
                  minDays={shareLinkExpireDaysMin}
                  maxDays={shareLinkExpireDaysMax}
                  defaultDays={shareLinkExpireDaysDefault}
                  expType={this.state.expType}
                  setExpType={this.setExpType}
                  expireDays={this.state.expireDays}
                  onExpireDaysChanged={this.onExpireDaysChanged}
                  expDate={this.state.expDate}
                  onExpDateChanged={this.onExpDateChanged}
                />
              </div>
            }
          </FormGroup>
          {(isPro && !isCustomPermission) && (
            <FormGroup check>
              <Label check>
                <span>{gettext('Set permission')}</span>
              </Label>
              {permissionOptions.map((item, index) => {
                return (
                  <FormGroup check className="ml-4" key={index}>
                    <Label check>
                      <Input type="radio" name="permission" value={item} checked={this.state.currentPermission == item} onChange={this.setPermission} className="mr-1" />
                      {Utils.getShareLinkPermissionObject(item).text}
                    </Label>
                  </FormGroup>
                );
              })}
            </FormGroup>
          )}
          {this.state.errorInfo && <Alert color="danger" className="mt-2">{gettext(this.state.errorInfo)}</Alert>}
          <Button onClick={this.generateShareLink} className="mt-2">{gettext('Generate')}</Button>
        </Form>
      </Fragment>
    );
  }
}

LinkCreation.propTypes = propTypes;

export default LinkCreation;
