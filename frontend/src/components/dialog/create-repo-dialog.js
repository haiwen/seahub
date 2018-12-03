import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Check } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {

};

class CreateRepoDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repoName: '',
      password: '',
      password2: '',
    };
    this.newInput = React.createRef();
  }

  handleChange = (e) => {
    this.setState({
      childName: e.target.value, 
    });
  }

  handleSubmit = () => {
    let path = this.state.parentPath + this.state.childName;
    this.props.onAddFolder(path);
  } 

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  }

  toggle = () => {
    this.props.addFolderCancel();
  }

  componentDidMount() {
    this.newInput.focus();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Folder')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="fileName">{gettext('Name')}: </Label>
              <Input 
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                id="fileName" placeholder={gettext('newName')} 
                value={this.state.childName} 
                onChange={this.handleNameChange}
              />
            </FormGroup>
            <FormGroup>
              <Input type="checkbox" id="encrypt"/>{gettext('Encrypt')}
            </FormGroup>
            <FormGroup>
              <Label for="fileName">{gettext('Password(at least 8 characters)')}</Label>
              <Input 
                id="fileName" 
                placeholder={gettext('password')} 
                value={this.state.childName} 
                onChange={this.handlePasswordChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="fileName">{gettext('Password again')}: </Label>
              <Input 
                id="fileName" 
                placeholder={gettext('password2')} 
                value={this.state.childName} 
                onChange={this.handlePassword2Change}
              />
            </FormGroup>
          </Form>
          <div className="err-message"></div>
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
