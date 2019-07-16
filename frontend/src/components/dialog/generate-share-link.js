import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, Alert } from 'reactstrap';
import { gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, shareLinkPasswordMinLength, canSendShareLinkEmail } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import SharedLinkInfo from '../../models/shared-link-info';
import toaster from '../toast';
import Loading from '../loading';
import SendLink from '../send-link';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
};

class GenerateShareLink extends React.Component {

  constructor(props) {
    super(props);

    this.isExpireDaysNoLimit = (parseInt(shareLinkExpireDaysMin) === 0 && parseInt(shareLinkExpireDaysMax) === 0 && shareLinkExpireDaysDefault == 0);
    this.defaultExpireDays = this.isExpireDaysNoLimit ? '' : shareLinkExpireDaysDefault;
    this.state = {
      isValidate: false,
      isShowPasswordInput: false,
      isPasswordVisible: false,
      isExpireChecked: !this.isExpireDaysNoLimit,
      password: '',
      passwdnew: '',
      expireDays: this.defaultExpireDays,
      errorInfo: '',
      sharedLinkInfo: null,
      isNoticeMessageShow: false,
      isLoading: true,
      fileInfo: null,
      isSendLinkShown: false
    };
    this.permissions = {
      'can_edit': false, 
      'can_download': true
    };
    this.isOfficeFile = Utils.isOfficeFile(this.props.itemPath);
  }

  componentDidMount() {
    let path = this.props.itemPath; 
    let repoID = this.props.repoID;
    seafileAPI.getShareLink(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        let sharedLinkInfo = new SharedLinkInfo(res.data[0]);
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
    if (this.isOfficeFile) {
      seafileAPI.getFileInfo(repoID, path).then((res) => {
        if (res.data) {
          this.setState({fileInfo: res.data});
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
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

  setPermission = (permission) => {
    if (permission == 'previewAndDownload') {
      this.permissions = {
        'can_edit': false,
        'can_download': true
      };
    } else if (permission == 'preview') {
      this.permissions = {
        'can_edit': false,
        'can_download': false
      };     
    } else if (permission == 'editOnCloudAndDownload'){
      this.permissions = {
        'can_edit': true,
        'can_download': true
      };
    }
  }

  generateShareLink = () => {
    let isValid = this.validateParamsInput();
    if (isValid) {
      this.setState({errorInfo: ''});
      let { itemPath, repoID } = this.props;
      let { password, isExpireChecked, expireDays } = this.state;
      let permissions = this.permissions;
      permissions = JSON.stringify(permissions);
      const expireDaysSent = isExpireChecked ? expireDays : '';
      seafileAPI.createShareLink(repoID, itemPath, password, expireDaysSent, permissions).then((res) => {
        let sharedLinkInfo = new SharedLinkInfo(res.data);
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
        passwordnew: '',
        isShowPasswordInput: false,
        expireDays: this.defaultExpireDays,
        isExpireChecked: !this.isExpireDaysNoLimit,
        errorInfo: '',
        sharedLinkInfo: null,
        isNoticeMessageShow: false,
      });
      this.permissions = {
        'can_edit': false,
        'can_download': true
      };
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
    let { isShowPasswordInput , password, passwdnew, isExpireChecked, expireDays } = this.state;
    // validate password
    if (isShowPasswordInput) {
      if (password.length === 0) {
        this.setState({errorInfo: 'Please enter password'});
        return false;
      }
      if (password.length < shareLinkPasswordMinLength) {
        this.setState({errorInfo: 'Password is too short'});
        return false;
      }
      if (password !== passwdnew) {
        this.setState({errorInfo: 'Passwords don\'t match'});
        return false;
      }
    }

    // validate days
    // no limit
    let reg = /^\d+$/;
    if (this.isExpireDaysNoLimit) {
      if (isExpireChecked) {
        if (!expireDays) {
          this.setState({errorInfo: 'Please enter days'});
          return false;
        }
        if (!reg.test(expireDays)) {
          this.setState({errorInfo: 'Please enter a non-negative integer'});
          return false;
        }
        this.setState({expireDays: parseInt(expireDays)});
      }
    } else {
      if (!expireDays) {
        this.setState({errorInfo: 'Please enter days'});
        return false;
      }
      if (!reg.test(expireDays)) {
        this.setState({errorInfo: 'Please enter a non-negative integer'});
        return false;
      }

      expireDays = parseInt(expireDays);
      let minDays = parseInt(shareLinkExpireDaysMin);
      let maxDays = parseInt(shareLinkExpireDaysMax);

      if (minDays !== 0 && maxDays !== maxDays) {
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

  onNoticeMessageToggle = () => {
    this.setState({isNoticeMessageShow: !this.state.isNoticeMessageShow});
  }

  toggleSendLink = () => {
    this.setState({ isSendLinkShown: !this.state.isSendLinkShown });
  }

  render() {

    if (this.state.isLoading) {
      return <Loading />;
    }

    let passwordLengthTip = gettext('(at least {passwordLength} characters)');
    passwordLengthTip = passwordLengthTip.replace('{passwordLength}', shareLinkPasswordMinLength);

    if (this.state.sharedLinkInfo) {
      let sharedLinkInfo = this.state.sharedLinkInfo;
      return (
        <div>
          <Form className="mb-4">
            <FormGroup className="mb-0">
              <dt className="text-secondary font-weight-normal">{gettext('Link:')}</dt>
              <dd className="d-flex">
                <span>{sharedLinkInfo.link}</span>{' '}
                {sharedLinkInfo.is_expired ?
                  <span className="err-message">({gettext('Expired')})</span> :
                  <span className="far fa-copy action-icon" onClick={this.onCopySharedLink}></span>
                }
              </dd>
            </FormGroup>
            {!sharedLinkInfo.is_dir && sharedLinkInfo.permissions.can_download &&(  //just for file
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Direct Download Link:')}</dt>
                <dd className="d-flex">
                  <span>{sharedLinkInfo.link}?dl=1</span>{' '}
                  {sharedLinkInfo.is_expired ?
                    <span className="err-message">({gettext('Expired')})</span> :
                    <span className="far fa-copy action-icon" onClick={this.onCopyDownloadLink}></span>
                  }
                </dd>
              </FormGroup>
            )}
            {sharedLinkInfo.expire_date && (
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Expiration Date:')}</dt>
                <dd>{moment(sharedLinkInfo.expire_date).format('YYYY-MM-DD hh:mm:ss')}</dd>
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
      let fileInfo = this.state.fileInfo;
      return (
        <Form className="generate-share-link">
          <FormGroup check>
            <Label check>
              <Input type="checkbox" onChange={this.onPasswordInputChecked}/>{'  '}{gettext('Add password protection')} 
            </Label>
          </FormGroup>
          {this.state.isShowPasswordInput &&
            <FormGroup className="link-operation-content" check>
              <Label className="font-weight-bold">{gettext('Password')}</Label>{' '}<span className="tip">{passwordLengthTip}</span>
              <InputGroup className="passwd">
                <Input type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.password || ''} onChange={this.inputPassword}/>
                <InputGroupAddon addonType="append">
                  <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                  <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                </InputGroupAddon>
              </InputGroup>
              <Label className="font-weight-bold">{gettext('Password again')}</Label>
              <Input className="passwd" type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.passwdnew || ''} onChange={this.inputPasswordNew} />
            </FormGroup>
          }
          {this.isExpireDaysNoLimit && (
            <Fragment>
              <FormGroup check>
                <Label check>
                  <Input className="expire-checkbox" type="checkbox" onChange={this.onExpireChecked} />{'  '}{gettext('Add auto expiration')}
                </Label>
              </FormGroup>
              {this.state.isExpireChecked && 
                <FormGroup check>
                  <Label check>
                    <Input className="expire-input expire-input-border" type="text" value={this.state.expireDays} onChange={this.onExpireDaysChanged} readOnly={!this.state.isExpireChecked} /><span className="expir-span">{gettext('days')}</span>
                  </Label>
                </FormGroup>
              }
            </Fragment>
          )}
          {!this.isExpireDaysNoLimit && (
            <Fragment>
              <FormGroup check>
                <Label check>
                  <Input className="expire-checkbox" type="checkbox" onChange={this.onExpireChecked} checked readOnly disabled/>{'  '}{gettext('Add auto expiration')}
                </Label>
              </FormGroup>
              <FormGroup check>
                <Label check>
                  <Input className="expire-input expire-input-border" type="text" value={this.state.expireDays} onChange={this.onExpireDaysChanged} /><span className="expir-span">{gettext('days')}</span>
                  {(parseInt(shareLinkExpireDaysMin) !== 0 && parseInt(shareLinkExpireDaysMax) !== 0) && (
                    <span className="d-inline-block ml-7">({shareLinkExpireDaysMin} - {shareLinkExpireDaysMax}{' '}{gettext('days')})</span>
                  )}
                  {(parseInt(shareLinkExpireDaysMin) !== 0 && parseInt(shareLinkExpireDaysMax) === 0) && (
                    <span className="d-inline-block ml-7">({gettext('Greater than or equal to')} {shareLinkExpireDaysMin}{' '}{gettext('days')})</span>
                  )}
                  {(parseInt(shareLinkExpireDaysMin) === 0 && parseInt(shareLinkExpireDaysMax) !== 0) && (
                    <span className="d-inline-block ml-7">({gettext('Less than or equal to')} {shareLinkExpireDaysMax}{' '}{gettext('days')})</span>
                  )}
                </Label>
              </FormGroup>
            </Fragment>
          )}
          <FormGroup check>
            <Label check>
              <span>{'  '}{gettext('Set permission')}</span>
            </Label>
          </FormGroup>
          <FormGroup check className="permission">
            <Label className="form-check-label">
              <Input type="radio" name="radio1" defaultChecked={true} onChange={() => this.setPermission('previewAndDownload')}/>{'  '}{gettext('Preview and download')}
            </Label>
          </FormGroup>
          <FormGroup check className="permission">
            <Label className="form-check-label">
              <Input type="radio" name="radio1" onChange={() => this.setPermission('preview')} />{'  '}{gettext('Preview only')}
            </Label>
          </FormGroup>
          {(this.isOfficeFile && fileInfo && fileInfo.can_edit) &&
            <FormGroup check className="permission">
              <Label className="form-check-label">
                <Input type="radio" name="radio1" onChange={() => this.setPermission('editOnCloudAndDownload')} />{'  '}{gettext('Edit on cloud and download')}
              </Label>
            </FormGroup>
          }
          {this.state.errorInfo && <Alert color="danger" className="mt-2">{gettext(this.state.errorInfo)}</Alert>}
          <Button onClick={this.generateShareLink} className="mt-2">{gettext('Generate')}</Button>
        </Form>
      );
    }
  }
}

GenerateShareLink.propTypes = propTypes;

export default GenerateShareLink;
