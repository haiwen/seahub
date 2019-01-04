import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import SharedLinkInfo from '../../models/shared-link-info';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired
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

  render() {
    if (this.state.sharedLinkInfo) {
      let sharedLinkInfo = this.state.sharedLinkInfo;
      return (
        <div>
          <div>
            <div>
              <span>{sharedLinkInfo.link}</span>
              <span className="fas fa-copy action-icon"></span>
            </div>
            <div>
              <span>{gettext('Expiration Data')}:</span>
              <span>{sharedLinkInfo.expire_date}</span>
            </div>
          </div>
          <Button onClick={this.deleteShareLink}>{gettext('Delete')}</Button>
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
              <Label>{gettext('Password')}</Label>{' '}<span className="tip">(at least 8 characters)</span>
              <InputGroup className="passwd">
                <Input type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.password || ''} onChange={this.inputPassword}/>
                <InputGroupAddon addonType="append">
                  <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                  <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                </InputGroupAddon>
              </InputGroup>
              <Label>{gettext('Password again')}</Label>
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
          <Label className="err-message">{gettext(this.state.errorInfo)}</Label><br />
          <Button onClick={this.generateShareLink}>{gettext('Generate')}</Button>
        </Form>
      );
    }
  }
}

GenerateShareLink.propTypes = propTypes;

export default GenerateShareLink;
