import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext, enableEncryptedLibrary, repoPasswordMinLength, storages } from '../../utils/constants';

const propTypes = {
  libraryType: PropTypes.string.isRequired,
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
      permission: 'rw',
      storage_id: storages.length ? storages[0].id : '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
  }

  handleRepoNameChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    this.setState({repoName: e.target.value});
  }

  handlePassword1Change = (e) => {
    this.setState({password1: e.target.value});
  }

  handlePassword2Change = (e) => {
    this.setState({password2: e.target.value});
  }

  handleSubmit = () => {
    let isValid = this.validateInputParams();
    if (isValid) {
      let repoData = this.prepareRepoData();
      if (this.props.libraryType === 'department') {
        this.props.onCreateRepo(repoData, 'department');
        return;
      }
      this.props.onCreateRepo(repoData);
    }
  } 

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
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
      errMessage = gettext('Name is required');
      this.setState({errMessage: errMessage});
      return false;
    }
    if (repoName.indexOf('/') > -1) {
      errMessage = gettext('Name should not include \'/\'.');
      this.setState({errMessage: errMessage});
      return false;
    }
    if (this.state.encrypt) {
      let password1 = this.state.password1.trim();
      let password2 = this.state.password2.trim();
      if (!password1.length) {
        errMessage = gettext('Please enter password');
        this.setState({errMessage: errMessage});
        return false;
      }
      if (!password2.length) {
        errMessage = gettext('Please enter the password again');
        this.setState({errMessage: errMessage});
        return false;
      }
      if (password1.length < repoPasswordMinLength) {
        errMessage = gettext('Password is too short');
        this.setState({errMessage: errMessage});
        return false;
      }
      if (password1 !== password2) {
        errMessage = gettext('Passwords don\'t match');
        this.setState({errMessage: errMessage});
        return false;
      }
    }
    return true;
  }

  onPermissionChange = (e) => {
    let permission = e.target.value;
    this.setState({permission: permission});
  }

  handleStorageInputChange = (selectedItem) => {
    this.setState({storage_id: selectedItem.value});
  }

  onEncrypted = (e) => {
    let isChecked = e.target.checked;
    this.setState({
      encrypt: isChecked,
      disabled: !isChecked
    });
  }

  prepareRepoData = () => {
    let libraryType = this.props.libraryType;

    let repoName = this.state.repoName.trim();
    let password = this.state.encrypt ? this.state.password1 : '';
    let permission = this.state.permission;

    let repo = null;
    if (libraryType === 'mine' || libraryType === 'public') {
      repo = {
        name: repoName,
        passwd: password
      };
    }
    if (libraryType === 'group') {
      repo = {
        repo_name: repoName,
        password: password,
        permission: permission,
      };
    }
    if (libraryType === 'department') {
      repo = {
        repo_name: repoName,
        passwd: password,
      };
    }
  
    const storage_id = this.state.storage_id;
    if (storage_id) {
      repo.storage_id = storage_id;
    }

    return repo;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Library')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input 
                id="repoName"
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                value={this.state.repoName} 
                onChange={this.handleRepoNameChange}
              />
            </FormGroup>
            {storages.length > 0 && (
              <FormGroup>
                <Label for="storage-backend">{gettext('Storage Backend')}</Label>
                <Select
                  id="storage-backend"
                  defaultValue={{value: storages[0].id, label: storages[0].name}}
                  options={storages.map((item, index) => { return {value: item.id, label: item.name}; })}
                  onChange={this.handleStorageInputChange}
                /> 
              </FormGroup>
            )}
            {this.props.libraryType === 'group' && (
              <FormGroup>
                <Label for="exampleSelect">{gettext('Permission')}</Label>
                <Input type="select" name="select" id="exampleSelect" onChange={this.onPermissionChange} value={this.state.permission}>
                  <option value='rw'>{gettext('Read-Write')}</option>
                  <option value='r'>{gettext('Read-Only')}</option>
                </Input>
              </FormGroup>
            )}
            {enableEncryptedLibrary &&
              <div>
                <FormGroup check>
                  <Input type="checkbox" id="encrypt" onChange={this.onEncrypted} />
                  <Label for="encrypt">{gettext('Encrypt')}</Label>
                </FormGroup>
                {!this.state.disabled && 
                  <FormGroup>
                    {/* todo translate */}
                    <Label for="passwd1">{gettext('Password')}</Label><span className="tip">{' '}{gettext('(at least {placeholder} characters)').replace('{placeholder}', repoPasswordMinLength)}</span>
                    <Input 
                      id="passwd1" 
                      type="password"
                      disabled={this.state.disabled}
                      value={this.state.password1} 
                      onChange={this.handlePassword1Change}
                      autoComplete="new-password"
                    />
                  </FormGroup>
                }
                {!this.state.disabled && 
                  <FormGroup>
                    <Label for="passwd2">{gettext('Password again')}</Label>
                    <Input 
                      id="passwd2"
                      type="password"
                      disabled={this.state.disabled}
                      value={this.state.password2} 
                      onChange={this.handlePassword2Change}
                      autoComplete="new-password"
                    />
                  </FormGroup>
                }
              </div>
            }
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateRepoDialog.propTypes = propTypes;

export default CreateRepoDialog;
