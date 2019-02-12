import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, Alert } from 'reactstrap';
import { gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import SharedLinkInfo from '../../models/shared-link-info';
import toaster from '../toast';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
};

class GenerateShareLink extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isValidate: false,
      isShowPasswordInput: false,
      isPasswordVisible: false,
      isExpireChecked: false,
      password: '',
      passwdnew: '',
      expireDays: '',
      errorInfo: '',
      sharedLinkInfo: null,
      isNoticeMessageShow: false,
    };
    this.permissions = {
      'can_edit': false, 
      'can_download': true
    };
    this.isExpireDaysNoLimit = (parseInt(shareLinkExpireDaysMin) === 0 && parseInt(shareLinkExpireDaysMax) === 0);
  }

  componentDidMount() {
    this.getShareLink();
  }

  getShareLink = () => {
    let path = this.props.itemPath; 
    let repoID = this.props.repoID;
    seafileAPI.getShareLink(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        let sharedLinkInfo = new SharedLinkInfo(res.data[0]);
        this.setState({sharedLinkInfo: sharedLinkInfo});
      }
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
    let val = Math.random().toString(36).substr(5);
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
    } else {
      this.permissions = {
        'can_edit': false,
        'can_download': false
      };     
    }
  }

  generateShareLink = () => {
    let isValid = this.validateParamsInput();
    if (isValid) {
      this.setState({errorInfo: ''});
      let { itemPath, repoID } = this.props;
      let { password, expireDays } = this.state;
      let permissions = this.permissions;
      permissions = JSON.stringify(permissions);
      seafileAPI.createShareLink(repoID, itemPath, password, expireDays, permissions).then((res) => {
        let sharedLinkInfo = new SharedLinkInfo(res.data);
        this.setState({sharedLinkInfo: sharedLinkInfo});
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
    let downloadLink = this.state.sharedLinkInfo.link + '?dl';
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
        expireDays: '',
        isExpireChecked: false,
        errorInfo: '',
        sharedLinkInfo: null,
        isNoticeMessageShow: false,
      });
      this.permissions = {
        'can_edit': false,
        'can_download': true
      };
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
      if (password.length < 8) {
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
        let flag = reg.test(expireDays);
        if (!flag) {
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
      let flag = reg.test(expireDays);
      if (!flag) {
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
        if (expireDays < minDays || expireDays < maxDays) {
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

  render() {
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
            {!sharedLinkInfo.is_dir && (  //just for file
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Direct Download Link:')}</dt>
                <dd className="d-flex">
                  <span>{sharedLinkInfo.link}?dl</span>{' '}
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
          {!this.state.isNoticeMessageShow ?
            <Button onClick={this.onNoticeMessageToggle}>{gettext('Delete')}</Button> :
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
            <Label check>
              <Input type="checkbox" onChange={this.onPasswordInputChecked}/>{'  '}{gettext('Add password protection')} 
            </Label>
          </FormGroup>
          {this.state.isShowPasswordInput &&
            <FormGroup className="link-operation-content">
              {/* todo translate  */}
              <Label className="font-weight-bold">{gettext('Password')}</Label>{' '}<span className="tip">{gettext('(at least 8 characters)')}</span>
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
            <FormGroup check>
              <Label check>
                <Input className="expire-checkbox" type="checkbox" onChange={this.onExpireChecked}/>{'  '}{gettext('Add auto expiration')}
                <Input className="expire-input" type="text" value={this.state.expireDays} onChange={this.onExpireDaysChanged} readOnly={!this.state.isExpireChecked}/><span>{gettext('days')}</span>
              </Label>
            </FormGroup>
          )}
          {!this.isExpireDaysNoLimit && (
            <FormGroup check>
              <Label check>
                <Input className="expire-checkbox" type="checkbox" onChange={this.onExpireChecked} checked readOnly/>{'  '}{gettext('Add auto expiration')}
                <Input className="expire-input" type="text" value={this.state.expireDays} onChange={this.onExpireDaysChanged} /> <span>{gettext('days')}</span>
                {(parseInt(shareLinkExpireDaysMin) !== 0 && parseInt(shareLinkExpireDaysMax) !== 0) && (
                  <span> ({shareLinkExpireDaysMin} - {shareLinkExpireDaysMax}{' '}{gettext('days')})</span>
                )}
                {(parseInt(shareLinkExpireDaysMin) !== 0 && parseInt(shareLinkExpireDaysMax) === 0) && (
                  <span> ({gettext('Greater than or equal to')} {shareLinkExpireDaysMin}{' '}{gettext('days')})</span>
                )}
                {(parseInt(shareLinkExpireDaysMin) === 0 && parseInt(shareLinkExpireDaysMax) !== 0) && (
                  <span> ({gettext('Less than or equal to')} {shareLinkExpireDaysMax}{' '}{gettext('days')})</span>
                )}
              </Label>
            </FormGroup>
          )}
          <FormGroup check>
            <Label check>
              <Input type="checkbox" checked readOnly/>{'  '}{gettext('Set permission')}
            </Label>
          </FormGroup>
          <FormGroup check className="permission">
            <Label check>
              <Input type="radio" name="radio1" defaultChecked={true} onChange={() => this.setPermission('previewAndDownload')}/>{'  '}{gettext('Preview and download')}
            </Label>
          </FormGroup>
          <FormGroup check className="permission">
            <Label check>
              <Input type="radio" name="radio1" onChange={() => this.setPermission('preview')} />{'  '}{gettext('Preview only')}
            </Label>
          </FormGroup>
          {this.state.errorInfo && <Alert color="danger" className="mt-2">{gettext(this.state.errorInfo)}</Alert>}
          <Button onClick={this.generateShareLink}>{gettext('Generate')}</Button>
        </Form>
      );
    }
  }
}

GenerateShareLink.propTypes = propTypes;

export default GenerateShareLink;
