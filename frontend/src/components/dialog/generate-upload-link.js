import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import moment from 'moment';
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, Alert } from 'reactstrap';
import { gettext, shareLinkPasswordMinLength, canSendShareLinkEmail } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import UploadLink from '../../models/upload-link';
import toaster from '../toast';
import SendLink from '../send-link';
import SessionExpiredTip from '../session-expired-tip';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
};

class GenerateUploadLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showPasswordInput: false,
      passwordVisible: false,
      password: '',
      passwdnew: '',
      sharedUploadInfo: null,
      isSendLinkShown: false,
      isExpireChecked: false,
      expireDays: 0,
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
      if (err.response.status === 403) {
        toaster.danger(
          <SessionExpiredTip />,
          {id: 'session_expired', duration: 3600}
        );
        this.props.closeShareDialog();
      }
    });
  }

  addPassword = () => {
    this.setState({
      showPasswordInput: !this.state.showPasswordInput,
      password: '',
      passwdnew: '',
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

  generateUploadLink = () => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    let { password, expireDays } = this.state;

    let isValid = this.validateParamsInput();
    if (isValid) {
      seafileAPI.createUploadLink(repoID, path, password, expireDays).then((res) => {
        let sharedUploadInfo = new UploadLink(res.data);
        this.setState({sharedUploadInfo: sharedUploadInfo}); 
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  validateParamsInput = () => {
    let { showPasswordInput , password, passwordnew, isExpireChecked, expireDays } = this.state;

    // check password params
    if (showPasswordInput) {
      if (password.length === 0) {
        this.setState({errorInfo: gettext('Please enter password')});
        return false;
      }
      if (password.length < shareLinkPasswordMinLength) {
        this.setState({errorInfo: gettext('Password is too short')});
        return false;
      }
      if (password !== passwordnew) {
        this.setState({errorInfo: gettext('Passwords don\'t match')});
        return false;
      }
    }

    // check expire day params
    let reg = /^\d+$/;
    if (isExpireChecked) {
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
        showPasswordInput: false,
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

    let passwordLengthTip = gettext('(at least {passwordLength} characters)');
    passwordLengthTip = passwordLengthTip.replace('{passwordLength}', shareLinkPasswordMinLength);
    if (this.state.sharedUploadInfo) {
      let sharedUploadInfo = this.state.sharedUploadInfo;
      return (
        <div>
          <Form className="mb-4">
            <FormGroup>
              <dt className="text-secondary font-weight-normal">{gettext('Upload Link:')}</dt>
              <dd className="d-flex">
                <span>{sharedUploadInfo.link}</span>
                <span className="far fa-copy action-icon" onClick={this.onCopyUploadLink}></span>
              </dd>
            </FormGroup>
            {sharedUploadInfo.expire_date && (
              <FormGroup className="mb-0">
                <dt className="text-secondary font-weight-normal">{gettext('Expiration Date:')}</dt>
                <dd>{moment(sharedUploadInfo.expire_date).format('YYYY-MM-DD hh:mm:ss')}</dd>
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
            <Input type="checkbox" onChange={this.addPassword}/>{'  '}{gettext('Add password protection')} 
          </Label>
        </FormGroup>
        {this.state.showPasswordInput &&
          <FormGroup className="link-operation-content">
            {/* todo translate  */}
            <Label className="font-weight-bold">{gettext('Password')}</Label>{' '}<span className="tip">{passwordLengthTip}</span>
            <InputGroup className="passwd">
              <Input type={this.state.passwordVisible ? 'text':'password'} value={this.state.password || ''} onChange={this.inputPassword}/>
              <InputGroupAddon addonType="append">
                <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.passwordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
              </InputGroupAddon>
            </InputGroup>
            <Label className="font-weight-bold">{gettext('Password again')}</Label>
            <Input className="passwd" type={this.state.passwordVisible ? 'text' : 'password'} value={this.state.passwordnew || ''} onChange={this.inputPasswordNew} />
          </FormGroup>
        }
        <FormGroup check>
          <Label check>
            <Input className="expire-checkbox" type="checkbox" onChange={this.onExpireChecked}/>{'  '}{gettext('Add auto expiration')}
          </Label>
        </FormGroup>
        {this.state.isExpireChecked &&
          <FormGroup check>
            <Label check>
              <Input className="expire-input expire-input-border" type="text" value={this.state.expireDays} onChange={this.onExpireDaysChanged} readOnly={!this.state.isExpireChecked}/><span className="expir-span">{gettext('days')}</span>
            </Label>
          </FormGroup>
        }
        {this.state.errorInfo && <Alert color="danger" className="mt-2">{this.state.errorInfo}</Alert>}
        <Button className="generate-link-btn" onClick={this.generateUploadLink}>{gettext('Generate')}</Button>
      </Form>
    );
  }
}

GenerateUploadLink.propTypes = propTypes;

export default GenerateUploadLink;
