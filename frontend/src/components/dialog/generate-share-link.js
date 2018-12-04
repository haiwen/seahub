import React from 'react';
import PropTypes from 'prop-types';
import { gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api'
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon } from 'reactstrap';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired
};

class GenerateShareLink extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      passwordVisible: false,
      showPasswordInput: false,
      isValidate: false,
      password: '',
      passwdnew: '',
      expireDays: '',
      token: '',
      link: '',
      errorInfo: ''
    };
    this.permissions = {
      "can_edit": false, 
      "can_download": true
    };
  }

  componentDidMount() {
    this.getShareLink();
  }

  getShareLink = () => {
    let path = this.props.itemPath; 
    let repoID = this.props.repoID;
    seafileAPI.getShareLink(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        this.setState({
          link: res.data[0].link,
          token: res.data[0].token,
        });
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
    let val = Math.random().toString(36).substr(2);
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

  setPermission = (permission) => {
    if (permission == 'previewAndDownload') {
      this.permissions = {
        "can_edit": false,
        "can_download": true
      };
    } else {
      this.permissions = {
        "can_edit": false,
        "can_download": false
      };     
    }
  }

  generateShareLink = () => {
    let path = this.props.itemPath; 
    let repoID = this.props.repoID;
    if (this.state.showPasswordInput && (this.state.password == '')) {
      this.setState({
        errorInfo: gettext('Please enter password')
      });
    }
    else if (this.state.showPasswordInput && (this.state.showPasswordInput && this.state.password.length < 8)) {
      this.setState({
        errorInfo: gettext('Password is too short')
      });
    }
    else if (this.state.showPasswordInput && (this.state.password !== this.state.passwordnew)) {
      this.setState({
        errorInfo: gettext("Passwords don't match")
      });
    } 
    else if (this.state.expireDays === '') {
      this.setState({
        errorInfo: gettext('Please enter days')
      });
    } else if (!this.state.isValidate) {
      return;
    } else {
      let { password, expireDays } = this.state;
      let permissions = this.permissions;
      permissions = JSON.stringify(permissions);
      seafileAPI.createShareLink(repoID, path, password, expireDays, permissions).then((res) => {
        this.setState({
          link: res.data.link,
          token: res.data.token
        });
      });
    }
  }

  deleteShareLink = () => {
    seafileAPI.deleteShareLink(this.state.token).then(() => {
      this.setState({
        link: '',
        token: '',
        showPasswordInput: false,
        password: '',
        passwordnew: '',
      });
      this.permissions = {
        "can_edit": false,
        "can_download": true
      };
    });
  } 

  onExpireHandler = (e) => {
    let day = e.target.value;
    let reg = /^\d+$/;
    let flag = reg.test(day);
    if (!flag) {
      this.setState({
        isValidate: false,
        errorInfo: gettext('Please enter a non-negative integer'),
        expireDays: day,
      });
      return;
    }
    
    day = parseInt(day);

    if (day < shareLinkExpireDaysMin || day > shareLinkExpireDaysMax) {
      let errorMessage = gettext('Please enter a value between day1 and day2');
      errorMessage = errorMessage.replace('day1', shareLinkExpireDaysMin);
      errorMessage = errorMessage.replace('day2', shareLinkExpireDaysMax);
      this.setState({
        isValidate: false,
        errorInfo: errorMessage,
        expireDays: day
      });
      return;
    }

    this.setState({
      isValidate: true,
      errorInfo: '',
      expireDays: day
    });
  }

  render() {
    if (this.state.link) {
      return (
        <Form>
          <p>{this.state.link}</p>
          <Button onClick={this.deleteShareLink}>{gettext('Delete')}</Button>
        </Form>
      );
    } else {
      return (
        <Form className="generate-share-link">
          <FormGroup check>
            <Label check>
              <Input type="checkbox" onChange={this.addPassword}/>{'  '}{gettext('Add password protection')} 
            </Label>
          </FormGroup>
          {this.state.showPasswordInput &&
            <FormGroup className="link-operation-content">
              <Label>{gettext('Password')}</Label><span className="tip"> ({gettext('at least 8 characters')}) </span>
              <InputGroup className="passwd">
                <Input type={this.state.passwordVisible ? 'text' : 'password'} value={this.state.password || ''} onChange={this.inputPassword}/>
                <InputGroupAddon addonType="append">
                  <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.passwordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                  <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                </InputGroupAddon>
              </InputGroup>
              <Label>{gettext('Password again')}</Label>
              <Input className="passwd" type={this.state.passwordVisible ? 'text' : 'password'} value={this.state.passwordnew || ''} onChange={this.inputPasswordNew} />
            </FormGroup>
          }
          <FormGroup check>
            <Label check>
              <Input className="expire-checkbox" type="checkbox" checked readOnly/>{'  '}{gettext('Add auto expiration')}
              <Input className="expire-input" type="text" value={this.state.expireDays} onChange={this.onExpireHandler}/> <span>{gettext('days')}</span>
              {parseInt(shareLinkExpireDaysMin) === 0 && parseInt(shareLinkExpireDaysMax) === 0 && (
                <span> ({gettext('no limit')})</span>
              )}
              {parseInt(shareLinkExpireDaysMax) !== 0 && (
                <span> ({shareLinkExpireDaysMin} - {shareLinkExpireDaysMax}{gettext('days')})</span>
              )}
            </Label>
          </FormGroup>
          <FormGroup check>
            <Label check>
              <Input type="checkbox" checked readOnly/>{'  '}{gettext('Set permission')}
            </Label>
          </FormGroup>
          <FormGroup check className="permission">
            <Label check>
             <Input type="radio" name="radio1" defaultChecked={true} onChange={this.setPermission('previewAndDownload')}/>{'  '}{gettext('Preview and download')}
            </Label>
          </FormGroup>
          <FormGroup check className="permission">
            <Label check>
              <Input type="radio" name="radio1" onChange={this.setPermission('preview')} />{'  '}{gettext('Preview only')}
            </Label>
          </FormGroup>
          <Label className="err-message">{this.state.errorInfo}</Label><br />
          <Button onClick={this.generateShareLink}>{gettext('Generate')}</Button>
        </Form>
      );
    }
  }
}

GenerateShareLink.propTypes = propTypes;

export default GenerateShareLink;
