import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, Alert } from 'reactstrap';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, shareLinkForceUsePassword, shareLinkPasswordMinLength, shareLinkPasswordStrengthLevel, canSendShareLinkEmail } from '../../utils/constants';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import Loading from '../loading';
import SendLink from '../send-link';
import SharedLink from '../shared-link';
import SetLinkExpiration from '../set-link-expiration';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
  userPerm: PropTypes.string,
  itemType: PropTypes.string
};

const inputWidth = Utils.isDesktop() ? 250 : 210;

class ShareLinkPanel extends React.Component {

  constructor(props) {
    super(props);

    this.isExpireDaysNoLimit = (shareLinkExpireDaysMin === 0 && shareLinkExpireDaysMax === 0 && shareLinkExpireDaysDefault == 0);
    this.defaultExpireDays = this.isExpireDaysNoLimit ? '' : shareLinkExpireDaysDefault;

    this.state = {
      isShowPasswordInput: shareLinkForceUsePassword ? true : false,
      isPasswordVisible: false,
      isExpireChecked: !this.isExpireDaysNoLimit,
      expType: 'by-days',
      expireDays: this.defaultExpireDays,
      expDate: null,
      password: '',
      passwdnew: '',
      errorInfo: '',
      sharedLinkInfo: null,
      shareLinks: [],
      isLoading: true,
      permissionOptions: [],
      currentPermission: '',
    };
  }

  componentDidMount() {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.getShareLink(repoID, path).then((res) => {
      this.setState({
        isLoading: false,
        shareLinks: res.data.map(item => new ShareLink(item))
      });
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
        const links = this.state.shareLinks;
        const newLink = new ShareLink(res.data);
        links.unshift(newLink);
        this.setState({
          password: '',
          passwdnew: '',
          isShowPasswordInput: shareLinkForceUsePassword ? true : false,
          expireDays: this.defaultExpireDays,
          expDate: null,
          isExpireChecked: !this.isExpireDaysNoLimit,
          errorInfo: '',
          sharedLinkInfo: newLink,
          shareLinks: links
        });
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

  showLinkDetails = (link) => {
    this.setState({
      sharedLinkInfo: link
    });
  }

  updateLink = (link) => {
    const { shareLinks } = this.state;
    this.setState({
      sharedLinkInfo: link,
      shareLinks: shareLinks.map(item => item.token == link.token ? link : item)
    });
  }

  deleteLink = () => {
    const { sharedLinkInfo, shareLinks } = this.state;
    seafileAPI.deleteShareLink(sharedLinkInfo.token).then(() => {
      this.setState({
        sharedLinkInfo: null,
        shareLinks: shareLinks.filter(item => item.token !== sharedLinkInfo.token)
      });
      toaster.success(gettext('The link is deleted.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    if (this.state.isLoading) {
      return <Loading />;
    }

    const { userPerm } = this.props;
    const { isCustomPermission } = Utils.getUserPermission(userPerm);
    const { shareLinks, permissionOptions, sharedLinkInfo } = this.state;

    if (sharedLinkInfo) {
      return (
        <LinkDetails
          sharedLinkInfo={sharedLinkInfo}
          permissionOptions={permissionOptions}
          defaultExpireDays={this.defaultExpireDays}
          showLinkDetails={this.showLinkDetails}
          updateLink={this.updateLink}
          deleteLink={this.deleteLink}
          closeShareDialog={this.props.closeShareDialog}
        />
      );
    } else {
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
                  <Input type="checkbox" checked={this.state.isShowPasswordInput} onChange={this.onPasswordInputChecked} />
                  <span>{gettext('Add password protection')}</span>
                </Label>
              )}
              {this.state.isShowPasswordInput &&
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
          {shareLinks.length > 0 && (
            <table className="table-hover">
              <thead>
                <tr>
                  <th width="28%">{gettext('Link')}</th>
                  <th width="30%">{gettext('Permission')}</th>
                  <th width="30%">{gettext('Expiration')}</th>
                  <th width="12%"></th>
                </tr>
              </thead>
              <tbody>
                {
                  shareLinks.map((item, index) => {
                    return (
                      <LinkItem
                        key={index}
                        item={item}
                        permissionOptions={permissionOptions}
                        showLinkDetails={this.showLinkDetails}
                      />
                    );
                  })
                }
              </tbody>
            </table>
          )}
        </Fragment>
      );
    }
  }
}

class LinkItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemOpVisible: false
    };
  }

  onMouseOver = () => {
    this.setState({
      isItemOpVisible: true
    });
  }

  onMouseOut = () => {
    this.setState({
      isItemOpVisible: false
    });
  }

  cutLink = (link) => {
    let length = link.length;
    return link.slice(0, 9) + '...' + link.slice(length-5);
  }

  viewDetails = (e) => {
    e.preventDefault();
    this.props.showLinkDetails(this.props.item);
  }

  render() {
    const { isItemOpVisible } = this.state;
    const { item, permissionOptions } = this.props;
    const { permissions, link, expire_date } = item;
    const currentPermission = Utils.getShareLinkPermissionStr(permissions);
    return (
      <tr onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
        <td>{this.cutLink(link)}</td>
        <td>
          {(isPro && permissions) && (
            <ShareLinkPermissionEditor
              isTextMode={true}
              isEditIconShow={false}
              currentPermission={currentPermission}
              permissionOptions={permissionOptions}
              onPermissionChanged={() => {}}
            />
          )}
        </td>
        <td>
          {expire_date ? moment(expire_date).format('YYYY-MM-DD HH:mm') : '--'}
        </td>
        <td>
          <a href="#" role="button" onClick={this.viewDetails} className={isItemOpVisible ? '' : 'invisible'}>{gettext('Details')}</a>
        </td>
      </tr>
    );
  }
}

LinkItem.propTypes = {
  item: PropTypes.object.isRequired,
  permissionOptions: PropTypes.array,
  showLinkDetails : PropTypes.func.isRequired
};

class LinkDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      storedPasswordVisible: false,
      isEditingExpiration: false,
      isExpirationEditIconShow: false,
      expType: 'by-days',
      expireDays: this.props.defaultExpireDays,
      expDate: null,
      isOpIconShown: false,
      isNoticeMessageShow: false,
      isSendLinkShown: false
    };
  }

  onCopySharedLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(sharedLinkInfo.link);
    toaster.success(gettext('Share link is copied to the clipboard.'));
    this.props.closeShareDialog();
  }

  onCopyDownloadLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(`${sharedLinkInfo.link}?dl=1`);
    toaster.success(gettext('Direct download link is copied to the clipboard.'));
    this.props.closeShareDialog();
  }

  toggleStoredPasswordVisible = () => {
    this.setState({
      storedPasswordVisible: !this.state.storedPasswordVisible
    });
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

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({expireDays: day});
  }

  updateExpiration = () => {
    const { sharedLinkInfo } = this.props;
    const { expType, expireDays, expDate } = this.state;
    let expirationTime = '';
    if (expType == 'by-days') {
      expirationTime = moment().add(parseInt(expireDays), 'days').format();
    } else {
      expirationTime = expDate.format();
    }
    seafileAPI.updateShareLink(sharedLinkInfo.token, '', expirationTime).then((res) => {
      this.setState({
        isEditingExpiration: false
      });
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  changePerm = (permission) => {
    const { sharedLinkInfo } = this.props;
    const { permissionDetails } = Utils.getShareLinkPermissionObject(permission);
    seafileAPI.updateShareLink(sharedLinkInfo.token, JSON.stringify(permissionDetails)).then((res) => {
      this.props.updateLink(new ShareLink(res.data));
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

  render() {
    const { sharedLinkInfo, permissionOptions } = this.props;
    const { isOpIconShown } = this.state;
    const currentPermission = Utils.getShareLinkPermissionStr(sharedLinkInfo.permissions);
    return (
      <div>
        <button className="fa fa-arrow-left back-icon border-0 bg-transparent text-secondary p-0" onClick={this.props.showLinkDetails.bind(this, null)} title={gettext('Back')} aria-label={gettext('Back')}></button>
        <dl>
          <dt className="text-secondary font-weight-normal">{gettext('Link:')}</dt>
          <dd>
            <SharedLink
              link={sharedLinkInfo.link}
              linkExpired={sharedLinkInfo.is_expired}
              copyLink={this.onCopySharedLink}
            />
          </dd>
          {!sharedLinkInfo.is_dir && sharedLinkInfo.permissions.can_download && ( // just for file
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Direct Download Link:')}</dt>
              <dd>
                <SharedLink
                  link={`${sharedLinkInfo.link}?dl=1`}
                  linkExpired={sharedLinkInfo.is_expired}
                  copyLink={this.onCopyDownloadLink}
                />
              </dd>
            </>
          )}
          {sharedLinkInfo.password && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Password:')}</dt>
              <dd className="d-flex">
                <div className="d-flex align-items-center">
                  <input id="stored-password" className="border-0 mr-1" type="text" value={this.state.storedPasswordVisible ? sharedLinkInfo.password : '****************************************'} readOnly={true} size={Math.max(sharedLinkInfo.password.length, 10)} />
                  <span tabIndex="0" role="button" aria-label={this.state.storedPasswordVisible ? gettext('Hide') : gettext('Show')} onKeyDown={this.onIconKeyDown} onClick={this.toggleStoredPasswordVisible} className={`eye-icon fas ${this.state.storedPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></span>
                </div>
              </dd>
            </>
          )}
          {sharedLinkInfo.expire_date && (
            <>
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
              <dd>
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
                  <div className={this.state.expType == 'by-days' ? 'mt-2' : 'mt-3'}>
                    <button className="btn btn-primary mr-2" onClick={this.updateExpiration}>{gettext('Update')}</button>
                    <button className="btn btn-secondary" onClick={this.editingExpirationToggle}>{gettext('Cancel')}</button>
                  </div>
                </div>
              </dd>
              }
            </>
          )}
          {(isPro && sharedLinkInfo.permissions) && (
            <>
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
            </>
          )}
        </dl>
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
          <button className="btn btn-primary" onClick={this.props.deleteLink}>{gettext('Delete')}</button>{' '}
          <button className="btn btn-secondary" onClick={this.onNoticeMessageToggle}>{gettext('Cancel')}</button>
        </div>
        }
      </div>
    );
  }
}

LinkDetails.propTypes = {
  sharedLinkInfo: PropTypes.object.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  defaultExpireDays: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  showLinkDetails: PropTypes.func.isRequired,
  updateLink: PropTypes.func.isRequired,
  deleteLink: PropTypes.func.isRequired,
  closeShareDialog: PropTypes.func.isRequired
};

ShareLinkPanel.propTypes = propTypes;

export default ShareLinkPanel;
