import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Button, Form, FormGroup, Label, Input, InputGroup, Alert } from 'reactstrap';
import { gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, shareLinkForceUsePassword, shareLinkPasswordMinLength, shareLinkPasswordStrengthLevel, isEmailConfigured } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { shareLinkAPI } from '../../utils/share-link-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import SetLinkExpiration from '../set-link-expiration';
import UserSelect from '../user-select';
import BackIcon from '../../components/back-icon';

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
const SHARE_LINK_MAX_NUMBER = 200;

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
      newPassword: '',
      errorInfo: '',
      currentPermission: props.currentPermission,

      currentScope: 'all_users',
      selectedUsers: [],
      inputEmails: ''
    };
  }

  setExpType = (e) => {
    this.setState({
      expType: e.target.value
    });
  };

  onExpDateChanged = (value) => {
    this.setState({
      expDate: value
    });
  };

  onPasswordInputChecked = () => {
    this.setState({
      isShowPasswordInput: !this.state.isShowPasswordInput,
      password: '',
      newPassword: '',
      errorInfo: ''
    });
  };

  togglePasswordVisible = () => {
    this.setState({
      isPasswordVisible: !this.state.isPasswordVisible
    });
  };

  generatePassword = () => {
    let val = Utils.generatePassword(shareLinkPasswordMinLength);
    this.setState({
      password: val,
      newPassword: val
    });
  };

  inputPassword = (e) => {
    let passwd = e.target.value.trim();
    this.setState({ password: passwd });
  };

  inputPasswordNew = (e) => {
    let passwd = e.target.value.trim();
    this.setState({ newPassword: passwd });
  };

  setPermission = (e) => {
    this.setState({ currentPermission: e.target.value });
  };

  generateShareLink = () => {
    let isValid = this.validateParamsInput();
    if (isValid) {
      this.setState({ errorInfo: '' });
      let { type, itemPath, repoID } = this.props;
      let { linkAmount, isShowPasswordInput, password, isExpireChecked, expType, expireDays, expDate } = this.state;

      const permissionDetails = Utils.getShareLinkPermissionObject(this.state.currentPermission).permissionDetails;
      let permissions;
      permissions = JSON.stringify(permissionDetails);

      let expirationTime = '';
      if (isExpireChecked) {
        if (expType === 'by-days') {
          expirationTime = dayjs().add(parseInt(expireDays), 'days').format();
        } else {
          expirationTime = expDate.format();
        }
      }

      let request;
      let users;
      if (type === 'batch') {
        const autoGeneratePassword = shareLinkForceUsePassword || isShowPasswordInput;
        request = seafileAPI.batchCreateMultiShareLink(repoID, itemPath, linkAmount, autoGeneratePassword, expirationTime, permissions);
      } else {
        const { currentScope, selectedUsers, inputEmails } = this.state;
        if (currentScope === 'specific_users' && selectedUsers) {
          users = selectedUsers.map((item, index) => item.email);
        }
        if (currentScope === 'specific_emails' && inputEmails) {
          users = inputEmails;
        }
        request = shareLinkAPI.createMultiShareLink(repoID, itemPath, password, expirationTime, permissions, currentScope, users);
      }

      request.then((res) => {
        if (type === 'batch') {
          const newLinks = res.data.map(item => new ShareLink(item));
          this.props.updateAfterCreation(newLinks);
        } else {
          const newLink = new ShareLink(res.data);
          this.props.updateAfterCreation(newLink);
        }
      }).catch((error) => {
        let resp_data = error.response.data;
        let errMessage = resp_data && resp_data['error_msg'];
        if (errMessage === 'Folder permission denied.') {
          this.setState({ errorInfo: gettext('Share links cannot be generated because "Invisible", "Online Read-Write" or "Online Read-Only" is set for you on some folder(s) in the library.') });
        } else {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        }
      });
    }
  };

  onExpireChecked = (e) => {
    this.setState({ isExpireChecked: e.target.checked });
  };

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({ expireDays: day });
  };

  validateParamsInput = () => {
    const { type } = this.props;
    let { linkAmount, isShowPasswordInput, password, newPassword, isExpireChecked, expType, expireDays, expDate } = this.state;

    if (type === 'batch') {
      if (!Number.isInteger(parseInt(linkAmount)) || parseInt(linkAmount) <= 1) {
        this.setState({ errorInfo: gettext('Please enter an integer bigger than 1 as number of links.') });
        return false;
      }
      if (parseInt(linkAmount) > SHARE_LINK_MAX_NUMBER) {
        this.setState({ errorInfo: gettext('Please enter an integer not bigger than {max_number} as number of links.').replace('{max_number}', SHARE_LINK_MAX_NUMBER) });
        return false;
      }
    }

    if (type === 'single' && isShowPasswordInput) {
      if (password.length === 0) {
        this.setState({ errorInfo: gettext('Please enter a password.') });
        return false;
      }
      if (password.length < shareLinkPasswordMinLength) {
        this.setState({ errorInfo: gettext('The password is too short.') });
        return false;
      }
      if (password !== newPassword) {
        this.setState({ errorInfo: gettext('Passwords don\'t match') });
        return false;
      }
      if (Utils.getStrengthLevel(password) < shareLinkPasswordStrengthLevel) {
        this.setState({ errorInfo: gettext('The password is too weak. It should include at least {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols.').replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel) });
        return false;
      }
    }

    if (isExpireChecked) {
      if (expType === 'by-date') {
        if (!expDate) {
          this.setState({ errorInfo: gettext('Please select an expiration time') });
          return false;
        }
        return true;
      }

      // by days
      let reg = /^\d+$/;
      if (!expireDays) {
        this.setState({ errorInfo: gettext('Please enter days') });
        return false;
      }
      if (!reg.test(expireDays)) {
        this.setState({ errorInfo: gettext('Please enter a non-negative integer') });
        return false;
      }

      expireDays = parseInt(expireDays);
      let minDays = shareLinkExpireDaysMin;
      let maxDays = shareLinkExpireDaysMax;

      if (minDays !== 0 && maxDays === 0) {
        if (expireDays < minDays) {
          this.setState({ errorInfo: 'Please enter valid days' });
          return false;
        }
      }

      if (minDays === 0 && maxDays !== 0) {
        if (expireDays > maxDays) {
          this.setState({ errorInfo: 'Please enter valid days' });
          return false;
        }
      }

      if (minDays !== 0 && maxDays !== 0) {
        if (expireDays < minDays || expireDays > maxDays) {
          this.setState({ errorInfo: 'Please enter valid days' });
          return false;
        }
      }

      this.setState({ expireDays: expireDays });
    }

    return true;
  };

  onLinkAmountChange = (e) => {
    this.setState({
      linkAmount: e.target.value
    });
  };

  goBack = () => {
    this.props.setMode('');
  };

  setScope = (e) => {
    this.setState({ currentScope: e.target.value, selectedUsers: [], inputEmails: '' });
  };

  handleSelectChange = (option) => {
    this.setState({ selectedUsers: option });
  };

  handleInputChange = (e) => {
    this.setState({
      inputEmails: e.target.value
    });
  };

  render() {
    const { userPerm, type, permissionOptions } = this.props;
    const { isCustomPermission } = Utils.getUserPermission(userPerm);

    return (
      <Fragment>
        <div className="d-flex align-items-center pb-2 border-bottom">
          <h6 className="font-weight-normal m-0">
            <BackIcon onClick={this.goBack} />
            {type === 'batch' ? gettext('Generate links in batch') : gettext('Generate Link')}
          </h6>
        </div>
        <Form className="pt-4">
          {type === 'batch' && (
            <FormGroup>
              <Label for="link-number" className="p-0">{gettext('Number of links')}</Label>
              <Input type="number" id="link-number" value={this.state.linkAmount} onChange={this.onLinkAmountChange} style={{ width: inputWidth }} />
            </FormGroup>
          )}
          <FormGroup check>
            {shareLinkForceUsePassword ? (
              <Label check>
                <Input type="checkbox" className="form-check-input" checked readOnly disabled />
                <span>{gettext('Add password protection')}</span>
              </Label>
            ) : (
              <Label check>
                <Input type="checkbox" className="form-check-input" checked={this.state.isShowPasswordInput} onChange={this.onPasswordInputChecked} />
                <span>{gettext('Add password protection')}</span>
              </Label>
            )}
            {type !== 'batch' && this.state.isShowPasswordInput &&
              <div className="ml-4">
                <FormGroup>
                  <Label for="passwd">{gettext('Password')}</Label>
                  <span className="tip">{gettext('(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)').replace('{passwordMinLength}', shareLinkPasswordMinLength).replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel)}</span>
                  <InputGroup style={{ width: inputWidth }}>
                    <Input id="passwd" type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.password || ''} onChange={this.inputPassword} />
                    <Button onClick={this.togglePasswordVisible}>
                      <i className={`link-operation-icon sf3-font sf3-font-eye${this.state.isPasswordVisible ? '' : '-slash'}`}></i>
                    </Button>
                    <Button onClick={this.generatePassword}>
                      <i className="link-operation-icon sf3-font sf3-font-magic"></i>
                    </Button>
                  </InputGroup>
                </FormGroup>
                <FormGroup>
                  <Label for="passwd-again">{gettext('Password again')}</Label>
                  <Input id="passwd-again" style={{ width: inputWidth }} type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.newPassword || ''} onChange={this.inputPasswordNew} />
                </FormGroup>
              </div>
            }
          </FormGroup>
          <FormGroup check>
            <Label check>
              {this.isExpireDaysNoLimit ? (
                <Input type="checkbox" className="form-check-input" onChange={this.onExpireChecked} />
              ) : (
                <Input type="checkbox" className="form-check-input" checked readOnly disabled />
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
          {!isCustomPermission && (
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
          {type !== 'batch' && (
            <FormGroup check>
              <Label check>
                <span>{gettext('Set access scope')}</span>
              </Label>
              <FormGroup check className="ml-4">
                <Label check>
                  <Input type="radio" name='scope' value={'all_users'} checked={this.state.currentScope === 'all_users'} onChange={this.setScope} className="mr-1" />
                  {gettext('Anyone with the link')}
                </Label>
              </FormGroup>
              <FormGroup check className="ml-4">
                <Label check>
                  <Input type="radio" name='scope' value={'specific_users'} checked={this.state.currentScope === 'specific_users'} onChange={this.setScope} className="mr-1" />
                  {gettext('Specific users in the team')}
                </Label>
                {this.state.currentScope === 'specific_users' &&
                <UserSelect
                  isMulti={true}
                  placeholder={gettext('Search users')}
                  onSelectChange={this.handleSelectChange}
                  selectedUsers={this.state.selectedUsers}
                />
                }
              </FormGroup>
              {isEmailConfigured && (
                <FormGroup check className="ml-4">
                  <Label check>
                    <Input type="radio" name='scope' value={'specific_emails'} checked={this.state.currentScope === 'specific_emails'} onChange={this.setScope} className="mr-1" />
                    {gettext('Specific people with email address')}
                  </Label>
                  {this.state.currentScope === 'specific_emails' &&
                  <input type="text" className="form-control" value={this.state.inputEmails} onChange={this.handleInputChange} placeholder={gettext('Emails, separated by \',\'')}/>
                  }
                </FormGroup>
              )}
            </FormGroup>
          )}
          {this.state.errorInfo && <Alert color="danger" className="mt-2">{gettext(this.state.errorInfo)}</Alert>}
          <Button color="primary" onClick={this.generateShareLink} className="mt-2 ml-1 mb-1">{gettext('Generate')}</Button>
        </Form>
      </Fragment>
    );
  }
}

LinkCreation.propTypes = propTypes;

export default LinkCreation;
