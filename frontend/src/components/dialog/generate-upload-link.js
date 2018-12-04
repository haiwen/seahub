import React from 'react';
import { gettext } from '../../utils/constants';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { Button, Form, FormGroup, FormText, Label, Input, InputGroup, InputGroupAddon } from 'reactstrap';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired
};

class GenerateUploadLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showPasswordInput: false,
      passwordVisible: false,
      password: '',
      passwdnew: '',
      link: '',
      token:''
    }
  }

  componentDidMount() {
    this.getUploadLink();
  }

  getUploadLink = () => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    seafileAPI.getUploadLinks(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        this.setState({
          link: res.data[0].link,
          token: res.data[0].token,
        });
      }
    })
  }

  addPassword = () => {
    this.setState({
      showPasswordInput: !this.state.showPasswordInput,
      password: '',
      passwdnew: '',
      errorInfo: ''
    })
  }

  togglePasswordVisible = () => {
    this.setState({
      passwordVisible: !this.state.passwordVisible
    })
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
        errorInfo: gettext("Passwords don't match")
      });
    } else {
      seafileAPI.createUploadLink(repoID, path, this.state.password)
        .then((res) => {
          this.setState({
            link: res.data.link,
            token: res.data.token  
          })    
        })
    }
  }

  deleteUploadLink = () => {
    seafileAPI.deleteUploadLink(this.state.token)
      .then((res) => {
        this.setState({
          link: '',
          token: '',
          showPasswordInput: false,
          password: '',
          passwordnew: '',
        })
      })
  }

  render() {
    if (this.state.link) {
      return (
        <Form>
          <p>{this.state.link}</p>
          <Button onClick={this.deleteUploadLink}>{gettext('Delete')}</Button>
        </Form>
      );
    } else {
      return (
        <Form className="generate-upload-link">
          <FormGroup>
            <FormText className="tip">{gettext('You can share the generated link to others and then they can upload files to this directory via the link.')}</FormText>
          </FormGroup>
          <FormGroup check>
            <Label className="" check>
              <Input type="checkbox" onChange={this.addPassword}/>{'  '}{gettext('Add password protection')} 
            </Label>
          </FormGroup>
          {this.state.showPasswordInput &&
            <FormGroup className="link-operation-content">
              <Label>{gettext('Password')}</Label><span className="tip"> ({gettext('at least 8 characters')}) </span>
              <InputGroup className="passwd">
                <Input type={this.state.passwordVisible ? 'text':'password'} value={this.state.password || ''} onChange={this.inputPassword}/>
                <InputGroupAddon addonType="append">
                  <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.passwordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                  <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                </InputGroupAddon>
              </InputGroup>
              <Label>{gettext('Password again')}</Label>
              <Input className="passwd" type={this.state.passwordVisible ? 'text' : 'password'} value={this.state.passwordnew || ''} onChange={this.inputPasswordNew} />
            </FormGroup>
          }
          <Label className="err-message">{this.state.errorInfo}</Label><br/>
          <Button className="generate-link-btn" onClick={this.generateUploadLink}>{gettext('Generate')}</Button>
        </Form>
      );
    }
  }
}

GenerateUploadLink.propTypes = propTypes;

export default GenerateUploadLink;
