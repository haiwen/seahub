import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, CustomInput, ModalBody, ModalFooter, Form, FormGroup, Label } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  onCreateRepo: PropTypes.func.isRequired,
  onCreateToggle: PropTypes.func.isRequired,
};

class CreateRepoDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repoName: '',
      disabled: true,
      encrypt: false,
      password1: '',
      password2: '',
      errMessage: '',
    };
    this.newInput = React.createRef();
  }

  handleRepoNameChange = (e) => {
    this.setState({repoName: e.target.value});
  }

  handlePassword1Change = (e) => {
    this.setState({password1: e.target.value});
  }

  handlePassword2Change = (e) => {
    this.setState({password2: e.target.value});
  }

  handleSubmit = () => {
    let isValidate = this.validateInputParams();
    if (isValidate) {
      let repoName = this.state.repoName.trim();
      let password = this.state.encrypt ? this.state.password1 : '';
      let repo = this.createRepo(repoName, password);
      this.props.onCreateRepo(repo);
    }
  } 

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  }

  toggle = () => {
    this.props.onCreateToggle();
  }

  componentDidMount() {
    this.newInput.focus();
  }

  validateInputParams() {
    let errMessage = '';
    let repoName = this.state.repoName.trim();
    if (!repoName.length) {
      errMessage = 'Name is required';
      this.setState({errMessage: errMessage});
      return false;

    }
    if (repoName.indexOf('/') > -1) {
      errMessage = 'Name should not include '/'.';
      this.setState({errMessage: errMessage});
      return;
    }
    if (this.state.encrypt) {
      let password1 = this.state.password1.trim();
      let password2 = this.state.password2.trim();
      if (!password1.length) {
        errMessage = 'Please enter password';
        this.setState({errMessage: errMessage});
        return false;
      }
      if (!password2.length) {
        errMessage = 'Please enter the password again';
        this.setState({errMessage: errMessage});
        return false;
      }
      if (password1.length < 8) {
        errMessage = 'Password is too short';
        this.setState({errMessage: errMessage});
        return false;
      }
      if (password1 !== password2) {
        errMessage = 'Passwords don\'t match';
        this.setState({errMessage: errMessage});
        return false;
      }
    }
    return true;
  }

  onEncrypted = (e) => {
    let isChecked = e.target.checked;
    this.setState({
      encrypt: isChecked,
      disabled: !isChecked
    });
  }

  createRepo = (repoName, password) => {
    let encrypt = password ? true : false;
    let repo = {
      id: null,
      name: repoName,
      desc: "",
      encrypted: encrypt,
      passwd: password,
      passwd1: password,
      passwd2: password,
      mtime: 0,
      mtime_relative: "",
      owner: "-",
      owner_nickname: "-",
      permission: "rw",
      storage_name: "-",
    };
    return repo;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Library')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="fileName">{gettext('Name')}: </Label>
              <Input 
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                id="fileName" placeholder={gettext('newName')} 
                value={this.state.repoName} 
                onChange={this.handleRepoNameChange}
              />
            </FormGroup>
            <FormGroup check>
              <Input type="checkbox" id="encrypt" onChange={this.onEncrypted}/>
              <Label for="encrypt">{gettext('Encrypt')}</Label>
            </FormGroup>
            <FormGroup>
              <Label for="passwd1">{gettext('Password')} ({gettext('at least 8 characters')})</Label>
              <Input 
                id="passwd1" 
                type="password"
                disabled={this.state.disabled}
                value={this.state.password1} 
                onChange={this.handlePassword1Change}
              />
            </FormGroup>
            <FormGroup>
              <Label for="passwd2">{gettext('Password again')}: </Label>
              <Input 
                id="passwd2"
                type="password"
                disabled={this.state.disabled}
                value={this.state.password2} 
                onChange={this.handlePassword2Change}
              />
            </FormGroup>
          </Form>
          <Label className="err-message">{gettext(this.state.errMessage)}</Label>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateRepoDialog.propTypes = propTypes;

export default CreateRepoDialog;
