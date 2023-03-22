import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, Alert } from 'reactstrap';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, shareLinkForceUsePassword, shareLinkPasswordMinLength, shareLinkPasswordStrengthLevel } from '../../utils/constants';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Loading from '../loading';
import SetLinkExpiration from '../set-link-expiration';


const LinkItemPropTypes = {
  index: PropTypes.number.isRequired,
  isLoading: PropTypes.bool.isRequired,
  shareLink: PropTypes.object.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  deleteShareLink: PropTypes.func.isRequired,
  onCopyShareLink: PropTypes.func.isRequired,
  onChangePerm: PropTypes.func.isRequired,
};

class LinkItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowOperation: false,
      isOpIconShown: false,
    };
  }

  onMouseEnter = () => {
    this.setState({isShowOperation: true});
  }

  onMouseLeave = () => {
    this.setState({isShowOperation: false});
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  cutLink = (link) => {
    let length = link.length;
    return link.slice(0, 9) + '...' + link.slice(length-5);
  }

  onDeleteShareLink = () => {
    let shareLink = this.props.shareLink;
    this.props.deleteShareLink(shareLink);
  }

  onCopyShareLink = () => {
    let shareLink = this.props.shareLink;
    this.props.onCopyShareLink(shareLink.link);
  }

  changePerm = (permission) => {
    let shareLink = this.props.shareLink;
    this.props.onChangePerm(permission, shareLink);
  }

  render() {
    if (this.props.isLoading) {
      return <Loading />;
    }
    let { shareLink, permissionOptions } = this.props;
    let { isShowOperation, isOpIconShown } = this.state;
    let currentPermission = Utils.getShareLinkPermissionStr(shareLink.permissions);

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>{this.cutLink(shareLink.link)}</td>
        <td>{shareLink.expire_date ? moment(shareLink.expire_date).format('YYYY-MM-DD HH:mm') : '-'}</td>
        <td>
          {(isPro && shareLink.permissions) && (
            <FormGroup className="mb-0">
              <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
                <ShareLinkPermissionEditor
                  isTextMode={true}
                  isEditIconShow={isOpIconShown && !shareLink.is_expired}
                  currentPermission={currentPermission}
                  permissionOptions={permissionOptions}
                  onPermissionChanged={this.changePerm}
                />
              </dd>
            </FormGroup>
          )}
        </td>
        <td>
          <span 
            className={`sf2-icon-copy action-icon ${isShowOperation ? '' : 'hide'}`} 
            data-placement="bottom" 
            onClick={this.onCopyShareLink} 
            title={gettext('Copy link')}
            aria-label={gettext('Copy link')}
          />
        </td>
        <td>
          <span
            className={`sf2-icon-x3 action-icon ${isShowOperation ? '' : 'hide'}`}
            onClick={this.onDeleteShareLink}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          />
        </td>
      </tr>
    );
  }
}

LinkItem.propTypes = LinkItemPropTypes;


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

    this.state = {
      isValidate: false,
      isShowPasswordInput: shareLinkForceUsePassword ? true : false,
      isPasswordVisible: false,
      isExpireChecked: !this.isExpireDaysNoLimit,
      isExpirationEditIconShow: false,
      isEditingExpiration: false,
      expType: 'by-days',
      expireDays: this.defaultExpireDays,
      expDate: null,
      password: '',
      passwdnew: '',
      storedPasswordVisible: false,
      errorInfo: '',
      shareLinks: [],
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
      let shareLinks = res.data;
      if (shareLinks.length > 0) {
        this.setState({
          shareLinks: shareLinks,
          isLoading: false,
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
      let { password, isExpireChecked, expType, expireDays, expDate } = this.state;
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
      seafileAPI.createMultiShareLink(repoID, itemPath, password, expirationTime, permissions).then((res) => {
        let shareLink = res.data;
        let shareLinks = this.state.shareLinks.slice();
        shareLinks.push(shareLink);
        this.setState({shareLinks: shareLinks});
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  onCopySharedLink = (url) => {
    copy(url);
    toaster.success(gettext('Share link is copied to the clipboard.'));
    this.props.closeShareDialog();
  }

  deleteShareLink = (shareLink) => {
    seafileAPI.deleteShareLink(shareLink.token).then(() => {
      let { shareLinks } = this.state;
      shareLinks = shareLinks.filter((item) => {
        return item.token !== shareLink.token;
      });
      this.setState({
        shareLinks: shareLinks,
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
    let { isShowPasswordInput, password, passwdnew, isExpireChecked, expType, expireDays, expDate } = this.state;

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

  handleMouseOverExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: true});
  }

  handleMouseOutExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: false});
  }

  editingExpirationToggle = () => {
    this.setState({isEditingExpiration: !this.state.isEditingExpiration});
  }

  updateExpiration = (e, shareLink) => {

    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();

    let { expType, expireDays, expDate } = this.state;

    let expirationTime = '';
    if (expType == 'by-days') {
      expirationTime = moment().add(parseInt(expireDays), 'days').format();
    } else {
      expirationTime = expDate.format();
    }

    seafileAPI.updateShareLink(shareLink.token, '', expirationTime).then((res) => {
      let shareLink = res.data;
      let { shareLinks } = this.state;
      shareLinks = shareLinks.map(item => {
        return item.token === shareLink.token ? shareLink: item;
      });
      this.setState({
        shareLinks: shareLinks,
        isEditingExpiration: false,
      });
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

  changePerm = (permission, shareLink) => {
    const permissionDetails = Utils.getShareLinkPermissionObject(permission).permissionDetails;
    seafileAPI.updateShareLink(shareLink.token, JSON.stringify(permissionDetails)).then((res) => {
      let shareLink = res.data;
      let { shareLinks } = this.state;
      shareLinks = shareLinks.map(item => {
        return item.token === shareLink.token ? shareLink: item;
      });
      this.setState({shareLinks: shareLinks});
      let message = gettext('Successfully modified permission.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let passwordLengthTip = gettext('(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)');
    passwordLengthTip = passwordLengthTip.replace('{passwordMinLength}', shareLinkPasswordMinLength)
      .replace('{passwordStrengthLevel}', shareLinkPasswordStrengthLevel);

    const { userPerm } = this.props;
    const { isCustomPermission } = Utils.getUserPermission(userPerm);

    let { shareLinks, isLoading, permissionOptions } = this.state;

    return (
      <Fragment>
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
        </Form>
        {this.state.errorInfo && <Alert color="danger" className="mt-2">{gettext(this.state.errorInfo)}</Alert>}
        <Button onClick={this.generateShareLink} className="mt-2">{gettext('Generate')}</Button>
        <div>
          <div style={{maxHeight: 'calc(18rem - 1.25rem)'}}>
            <table>
              <thead>
                <tr>
                  <th width="22%">{gettext('Share links')}</th>
                  <th width="28%">{gettext('Expire date')}</th>
                  <th width="40%">{gettext('Permission')}</th>
                  <th width="5%"></th>
                  <th width="5%"></th>
                </tr>
              </thead>
              <tbody>
                {
                  shareLinks.map((item, index) => {
                    return (
                      <LinkItem 
                        key={index}
                        index={index}
                        shareLink={item}
                        isLoading={isLoading}
                        permissionOptions={permissionOptions}
                        deleteShareLink={this.deleteShareLink}
                        onCopyShareLink={this.onCopySharedLink}
                        onChangePerm={this.changePerm}
                      />
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </Fragment>
    );
  }
}

GenerateShareLink.propTypes = propTypes;

export default GenerateShareLink;
