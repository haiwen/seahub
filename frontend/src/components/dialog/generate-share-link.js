import React from 'react';
import { gettext } from '../../utils/constants';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api'
import { Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon} from 'reactstrap';

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
      password: '',
      passwdnew: '',
      daysOn: false,
      expireDays: '7',
      token:'',
      link:'',
      errorInfo: ''
    };
    this.permissions = '{"can_edit":false, "can_download":true}'
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

  autoExpiration = () => {
    this.setState({
      expireDays: '7', 
      daysOn: !this.state.daysOn
    })
  }

  setPermission = (permission) => {
    if (permission == 'previewAndDownload') {
      this.permissions = '{"can_edit":false,"can_download":true}'
    } else {
      this.permissions = '{"can_edit":false,"can_download":false}'      
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
    else if (this.state.daysOn && (this.state.validDays == '')) {
      this.setState({
        errorInfo: gettext('Please enter days')
      });
    } 
    else {
      seafileAPI.createShareLink(repoID, path, this.state.password, this.state.expireDays, this.permissions)
        .then((res) => {
          this.setState({
            link: res.data.link,
            token: res.data.token
          })
        })
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
      this.permissions = '{"can_edit":false, "can_download":true}'
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
        <Form>
          <FormGroup check>
            <Label check>
              <Input type="checkbox" onChange={this.addPassword}/> {'  '}{gettext('Add password protection')} 
            </Label>
          </FormGroup>
          {this.state.showPasswordInput &&
            <FormGroup>
              <Label>{gettext('Password')}({gettext('at least 8 characters')})</Label>
              <InputGroup>
              <Input type={this.state.passwordVisible ? 'text':'password'} value={this.state.password} onChange={this.inputPassword}/>
              <InputGroupAddon addonType="append">
                <Button onClick={this.togglePasswordVisible}><i className={`fas ${this.state.passwordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                <Button onClick={this.generatePassword}><i className="fas fa-magic"></i></Button>
              </InputGroupAddon>
              </InputGroup>
              <Label>{gettext('Password again')}</Label>
              <Input type={this.state.passwordVisible?'text':'password'} value={this.state.passwordnew} onChange={this.inputPasswordNew} />
            </FormGroup>
          }
          <FormGroup check>
            <Label check>
              <Input type="checkbox" onChange={this.autoExpiration} /> {'  '}{gettext('Add auto expiration')}
            </Label>
          </FormGroup>
          <FormGroup check>
            <Label check>
              <Input type="checkbox" checked readOnly/> {'  '}{gettext('Set permission')}
            </Label>
          </FormGroup>
          <FormGroup check style={{"marginLeft": "18px"}} >
            <Label check>
             <Input type="radio" name="radio1" defaultChecked={true} onChange={this.setPermission('previewAndDownload')}/> {'  '}{gettext('Preview and download')}
            </Label>
          </FormGroup>
          <FormGroup check style={{"marginLeft": "18px"}}>
            <Label check>
              <Input type="radio" name="radio1" onChange={this.setPermission('preview')} /> {'  '}{gettext('Preview only')}
            </Label>
          </FormGroup>
          <Label>{this.state.errorInfo}</Label><br />
          <Button onClick={this.generateShareLink}>{gettext('Generate')}</Button>
        </Form>
      );
    }
  }
}

GenerateShareLink.propTypes = propTypes;

export default GenerateShareLink;
