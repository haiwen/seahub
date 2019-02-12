import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import { Button, Form, FormGroup, FormText, Label, Input, InputGroup, InputGroupAddon, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import SharedUploadInfo from '../../models/shared-upload-info';
import toaster from '../toast';

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
    };
  }

  componentDidMount() {
    this.getUploadLink();
  }

  getUploadLink = () => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    seafileAPI.getUploadLinks(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        let sharedUploadInfo = new SharedUploadInfo(res.data[0]);
        this.setState({sharedUploadInfo: sharedUploadInfo});
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
    let val = Math.random().toString(36).substr(5);
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
        errorInfo: gettext('Passwords don\'t match')
      });
    } else {
      seafileAPI.createUploadLink(repoID, path, this.state.password).then((res) => {
        let sharedUploadInfo = new SharedUploadInfo(res.data);
        this.setState({sharedUploadInfo: sharedUploadInfo}); 
      });
    }
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
    });
  }

  render() {
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
          </Form>
          <Button onClick={this.deleteUploadLink}>{gettext('Delete')}</Button>
        </div>
      );
    }
    return (
      <Form className="generate-upload-link">
        <FormGroup>
          <FormText className="tip">{gettext('You can share the generated link to others and then they can upload files to this directory via the link.')}</FormText>
        </FormGroup>
        <FormGroup check>
          <Label check>
            <Input type="checkbox" onChange={this.addPassword}/>{'  '}{gettext('Add password protection')} 
          </Label>
        </FormGroup>
        {this.state.showPasswordInput &&
          <FormGroup className="link-operation-content">
            {/* todo translate  */}
            <Label className="font-weight-bold">{gettext('Password')}</Label>{' '}<span className="tip">{gettext('(at least 8 characters)')}</span>
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
        {this.state.errorInfo && <Alert color="danger" className="mt-2">{this.state.errorInfo}</Alert>}
        <Button className="generate-link-btn" onClick={this.generateUploadLink}>{gettext('Generate')}</Button>
      </Form>
    );
  }
}

GenerateUploadLink.propTypes = propTypes;

export default GenerateUploadLink;
