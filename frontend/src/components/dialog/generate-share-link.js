import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, InputGroupText, Alert, FormText } from 'reactstrap';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, shareLinkForceUsePassword, shareLinkPasswordMinLength, shareLinkPasswordStrengthLevel, canSendShareLinkEmail } from '../../utils/constants';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import Loading from '../loading';
import SendLink from '../send-link';
import DateTimePicker from '../date-and-time-picker';
import SharedLink from '../shared-link';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
  userPerm: PropTypes.string,
};

const inputWidth = Utils.isDesktop() ? 250 : 210;

class GenerateShareLink extends React.Component {

  constructor(props) {
    super(props);

    this.isExpireDaysNoLimit = (shareLinkExpireDaysMin === 0 && shareLinkExpireDaysMax === 0 && shareLinkExpireDaysDefault == 0);
    this.defaultExpireDays = this.isExpireDaysNoLimit ? '' : shareLinkExpireDaysDefault;

    let expirationLimitTip = '';
    if (shareLinkExpireDaysMin !== 0 && shareLinkExpireDaysMax !== 0) {
      expirationLimitTip = gettext('{minDays_placeholder} - {maxDays_placeholder} days')
        .replace('{minDays_placeholder}', shareLinkExpireDaysMin)
        .replace('{maxDays_placeholder}', shareLinkExpireDaysMax);
    } else if (shareLinkExpireDaysMin !== 0 && shareLinkExpireDaysMax === 0) {
      expirationLimitTip = gettext('Greater than or equal to {minDays_placeholder} days')
        .replace('{minDays_placeholder}', shareLinkExpireDaysMin);
    } else if (shareLinkExpireDaysMin === 0 && shareLinkExpireDaysMax !== 0) {
      expirationLimitTip = gettext('Less than or equal to {maxDays_placeholder} days')
        .replace('{maxDays_placeholder}', shareLinkExpireDaysMax);
    }
    this.expirationLimitTip = expirationLimitTip;

    this.state = {
      isOpIconShown: false,
      isValidate: false,
      isShowPasswordInput: shareLinkForceUsePassword ? true : false,
      isPasswordVisible: false,
      isExpireChecked: !this.isExpireDaysNoLimit,
      isExpirationEditIconShow: false,
      isEditingExpiration: false,
      setExp: 'by-days',
      expireDays: this.defaultExpireDays,
      expDate: null,
      password: '',
      passwdnew: '',
      storedPasswordVisible: false,
      errorInfo: '',
      sharedLinkInfo: null,
      isNoticeMessageShow: false,
      isLoading: true,
      permissionOptions: [],
      currentPermission: '',
      isSendLinkShown: false
    };
  }

  componentDidMount() {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.getShareLink(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        let sharedLinkInfo = new ShareLink(res.data[0]);
        this.setState({
          isLoading: false,
          sharedLinkInfo: sharedLinkInfo
        });
      } else {
        this.setState({isLoading: false});
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });

    if (isPro) {
      const { itemType, userPerm } = this.props;
      if (itemType == 'library') {
        let permissionOptions = Utils.getShareLinkPermissionList(itemType, userPerm, path);
        this.setState({
          permissionOptions: permissionOptions,
          currentPermission: permissionOptions[0],
        });
      } else {
        let getDirentInfoAPI;
        if (this.props.itemType === 'file') {
          getDirentInfoAPI = seafileAPI.getFileInfo(repoID, path);
        } else if (this.props.itemType === 'dir') {
          getDirentInfoAPI = seafileAPI.getDirInfo(repoID, path);
        }
        getDirentInfoAPI.then((res) => {
          let canEdit = res.data.can_edit;
          let permission = res.data.permission;
          let permissionOptions = Utils.getShareLinkPermissionList(this.props.itemType, permission, path, canEdit);
          this.setState({
            permissionOptions: permissionOptions,
            currentPermission: permissionOptions[0],
          });
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }
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

    const startDay = moment().add(shareLinkExpireDaysMin, 'days');
    const endDay = moment().add(shareLinkExpireDaysMax, 'days');
    if (shareLinkExpireDaysMin !== 0 && shareLinkExpireDaysMax !== 0) {
      return current.isBefore(startDay, 'day') || current.isAfter(endDay, 'day');
    } else if (shareLinkExpireDaysMin !== 0 && shareLinkExpireDaysMax === 0) {
      return current.isBefore(startDay, 'day');
    } else if (shareLinkExpireDaysMin === 0 && shareLinkExpireDaysMax !== 0) {
      return current.isBefore(moment(), 'day') || current.isAfter(endDay, 'day');
    }
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

  toggleStoredPasswordVisible = () => {
    this.setState({
      storedPasswordVisible: !this.state.storedPasswordVisible
    });
  }

  setPermission = (e) => {
    this.setState({currentPermission: e.target.value});
  }

  generateShareLink = () => {
    let isValid = this.validateParamsInput();
    if (isValid) {
      this.setState({errorInfo: ''});
      let { itemPath, repoID } = this.props;
      let { password, isExpireChecked, setExp, expireDays, expDate } = this.state;
      let permissions;
      if (isPro) {
        const permissionDetails = Utils.getShareLinkPermissionObject(this.state.currentPermission).permissionDetails;
        permissions = JSON.stringify(permissionDetails);
      }
      let expirationTime = '';
      if (isExpireChecked) {
        if (setExp == 'by-days') {
          expirationTime = moment().add(parseInt(expireDays), 'days').format();
        } else {
          expirationTime = expDate.format();
        }
      }
      seafileAPI.createShareLink(repoID, itemPath, password, expirationTime, permissions).then((res) => {
        let sharedLinkInfo = new ShareLink(res.data);
        this.setState({sharedLinkInfo: sharedLinkInfo});
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  onCopySharedLink = () => {
    let sharedLink = this.state.sharedLinkInfo.link;
    copy(sharedLink);
    toaster.success(gettext('Share link is copied to the clipboard.'));
    this.props.closeShareDialog();
  }

  onCopyDownloadLink = () => {
    let downloadLink = this.state.sharedLinkInfo.link + '?dl=1';
    copy(downloadLink);
    toaster.success(gettext('Direct download link is copied to the clipboard.'));
    this.props.closeShareDialog();
  }

  deleteShareLink = () => {
    let sharedLinkInfo = this.state.sharedLinkInfo;
    seafileAPI.deleteShareLink(sharedLinkInfo.token).then(() => {
      this.setState({
        password: '',
        passwdnew: '',
        isShowPasswordInput: shareLinkForceUsePassword ? true : false,
        expireDays: this.defaultExpireDays,
        isExpireChecked: !this.isExpireDaysNoLimit,
        errorInfo: '',
        sharedLinkInfo: null,
        isNoticeMessageShow: false,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onExpireChecked = (e) => {
    this.setState({isExpireChecked: e.target.checked});
  }

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({expireDays: day});
  }

  validateParamsInput = () => {
    let { isShowPasswordInput, password, passwdnew, isExpireChecked, setExp, expireDays, expDate } = this.state;

    // validate password
    if (isShowPasswordInput) {
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
      if (setExp == 'by-date') {
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

  handleMouseOverExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: true});
  }

  handleMouseOutExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: false});
  }

  editingExpirationToggle = () => {
    this.setState({isEditingExpiration: !this.state.isEditingExpiration});
  }

  updateExpiration = (e) => {

    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();

    let { setExp, expireDays, expDate } = this.state;

    let expirationTime = '';
    if (setExp == 'by-days') {
      expirationTime = moment().add(parseInt(expireDays), 'days').format();
    } else {
      expirationTime = expDate.format();
    }

    seafileAPI.updateShareLink(this.state.sharedLinkInfo.token, '', expirationTime).then((res) => {
      let sharedLinkInfo = new ShareLink(res.data);
      this.setState({
	sharedLinkInfo: sharedLinkInfo,
	isEditingExpiration: false,
      });
      let message = gettext('Successfully update expiration.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onNoticeMessageToggle = () => {
    this.setState({isNoticeMessageShow: !this.state.isNoticeMessageShow});
  }

  toggleSendLink = () => {
    this.setState({ isSendLinkShown: !this.state.isSendLinkShown });
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  changePerm = (permission) => {
    const permissionDetails = Utils.getShareLinkPermissionObject(permission).permissionDetails;
    seafileAPI.updateShareLink(this.state.sharedLinkInfo.token, JSON.stringify(permissionDetails)).then((res) => {
      let sharedLinkInfo = new ShareLink(res.data);
      this.setState({sharedLinkInfo: sharedLinkInfo});
      let message = gettext('Successfully modified permission.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    if (this.state.isLoading) {
      return <Loading />;
    }

    let passwordLengthTip = gettext('(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)');
    passwordLengthTip = passwordLengthTip.replace('{passwordMinLength}', shareLinkPasswordMinLength)
                                         .replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel);

    const { userPerm } = this.props;
    const { isCustomPermission } = Utils.getUserPermission(userPerm);

    if (this.state.sharedLinkInfo) {
      let sharedLinkInfo = this.state.sharedLinkInfo;
      let currentPermission = Utils.getShareLinkPermissionStr(sharedLinkInfo.permissions);
      const { permissionOptions , isOpIconShown } = this.state;
      return (
        <div>
          <Form className="mb-4">
            <FormGroup className="mb-0">
              <dt className="text-secondary font-weight-normal">{gettext('Link:')}</dt>
              <dd>
                <SharedLink
                  link={sharedLinkInfo.link}
                  linkExpired={sharedLinkInfo.is_expired}
                  copyLink={this.onCopySharedLink}
                />
              </dd>
            </FormGroup>
            {!sharedLinkInfo.is_dir && sharedLinkInfo.permissions.can_download &&(  //just for file
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Direct Download Link:')}</dt>
                <dd>
                  <SharedLink
                    link={`${sharedLinkInfo.link}?dl=1`}
                    linkExpired={sharedLinkInfo.is_expired}
                    copyLink={this.onCopyDownloadLink}
                  />
                </dd>
              </FormGroup>
            )}
            {sharedLinkInfo.password && (
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Password:')}</dt>
                <dd className="d-flex">
                  <div className="d-flex align-items-center">
                    <input id="stored-password" className="border-0 mr-1" type="text" value={this.state.storedPasswordVisible ? sharedLinkInfo.password : '****************************************'} readOnly={true} size={Math.max(sharedLinkInfo.password.length, 10)} />
                    <span tabIndex="0" role="button" aria-label={this.state.storedPasswordVisible ? gettext('Hide') : gettext('Show')} onKeyDown={this.onIconKeyDown} onClick={this.toggleStoredPasswordVisible} className={`eye-icon fas ${this.state.storedPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></span>
                  </div>
                </dd>
              </FormGroup>
            )}
            {sharedLinkInfo.expire_date && (
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Expiration Date:')}</dt>
                {!this.state.isEditingExpiration &&
                  <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOverExpirationEditIcon} onMouseLeave={this.handleMouseOutExpirationEditIcon}>
		    {moment(sharedLinkInfo.expire_date).format('YYYY-MM-DD HH:mm:ss')}
                    {this.state.isExpirationEditIconShow && (
                      <a href="#"
                        role="button"
                        aria-label={gettext('Edit')}
                        title={gettext('Edit')}
                        className="fa fa-pencil-alt attr-action-icon"
                        onClick={this.editingExpirationToggle}>
                      </a>
                    )}
                  </dd>
                }
                {this.state.isEditingExpiration &&
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
                    <button className="btn btn-primary" onClick={this.updateExpiration}>{gettext('Update')}</button>{' '}
                    <button className="btn btn-secondary" onClick={this.editingExpirationToggle}>{gettext('Cancel')}</button>
                  </div>
                }
              </FormGroup>
            )}

            {(isPro && sharedLinkInfo.permissions) && (
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Permission:')}</dt>
                <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
                  <ShareLinkPermissionEditor
                    isTextMode={true}
                    isEditIconShow={isOpIconShown && !sharedLinkInfo.is_expired}
                    currentPermission={currentPermission}
                    permissionOptions={permissionOptions}
                    onPermissionChanged={this.changePerm}
                  />
                </dd>
              </FormGroup>
            )}

          </Form>
          {(canSendShareLinkEmail && !this.state.isSendLinkShown && !this.state.isNoticeMessageShow) &&
            <Button onClick={this.toggleSendLink} className='mr-2'>{gettext('Send')}</Button>
          }
          {this.state.isSendLinkShown &&
          <SendLink
            linkType='shareLink'
            token={sharedLinkInfo.token}
            toggleSendLink={this.toggleSendLink}
            closeShareDialog={this.props.closeShareDialog}
          />
          }
          {(!this.state.isSendLinkShown && !this.state.isNoticeMessageShow) &&
            <Button onClick={this.onNoticeMessageToggle}>{gettext('Delete')}</Button>
          }
          {this.state.isNoticeMessageShow &&
            <div className="alert alert-warning">
              <h4 className="alert-heading">{gettext('Are you sure you want to delete the share link?')}</h4>
              <p className="mb-4">{gettext('If the share link is deleted, no one will be able to access it any more.')}</p>
              <button className="btn btn-primary" onClick={this.deleteShareLink}>{gettext('Delete')}</button>{' '}
              <button className="btn btn-secondary" onClick={this.onNoticeMessageToggle}>{gettext('Cancel')}</button>
            </div>
          }
        </div>
      );
    } else {
      return (
        <Form className="generate-share-link">
          <FormGroup check>
            {shareLinkForceUsePassword ? (
            <Label check>
              <Input type="checkbox" checked readOnly disabled />
              <span>{gettext('Add password protection')}</span>
            </Label>
            ) : (
            <Label check>
              <Input type="checkbox" onChange={this.onPasswordInputChecked} />
              <span>{gettext('Add password protection')}</span>
            </Label>
            )}
            {this.state.isShowPasswordInput &&
            <div className="ml-4">
              <FormGroup>
                <Label for="passwd">{gettext('Password')}</Label>
                <span className="tip">{passwordLengthTip}</span>
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
          {(isPro && !isCustomPermission) && (
            <FormGroup check>
              <Label check>
                <span>{gettext('Set permission')}</span>
              </Label>
              {this.state.permissionOptions.map((item, index) => {
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
      );
    }
  }
}

GenerateShareLink.propTypes = propTypes;

export default GenerateShareLink;
