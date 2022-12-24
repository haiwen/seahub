import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  fileType: PropTypes.string,
  parentPath: PropTypes.string.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  checkDuplicatedName: PropTypes.func.isRequired,
  addFolderCancel: PropTypes.func.isRequired,
};

class CreateForder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      parentPath: '',
      childName: '',
      errMessage: '',
      isSubmitBtnActive: false,
    };
  }

  componentDidMount() {
    let parentPath = this.props.parentPath;
    if (parentPath[parentPath.length - 1] === '/') {  // mainPanel
      this.setState({parentPath: parentPath});
    } else {
      this.setState({parentPath: parentPath + '/'}); // sidePanel
    }
  }

  handleChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    this.setState({childName: e.target.value});
  }

  handleSubmit = () => {
    if (!this.state.isSubmitBtnActive) {
      return;
    }

    let newName = this.state.childName;
    let isDuplicated = this.checkDuplicatedName();

    if (isDuplicated) {
      let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
      errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
      this.setState({errMessage: errMessage});
    } else {
      let path = this.state.parentPath + newName;
      this.props.onAddFolder(path);
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  toggle = () => {
    this.props.addFolderCancel();
  }

  checkDuplicatedName = () => {
    let isDuplicated = this.props.checkDuplicatedName(this.state.childName);
    return isDuplicated;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false}>
        <ModalHeader toggle={this.toggle}>{gettext('New Folder')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="folderName">{gettext('Name')}</Label>
              <Input
                id="folderName"
                value={this.state.childName}
                onKeyPress={this.handleKeyPress}
                onChange={this.handleChange}
                autoFocus={true}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateForder.propTypes = propTypes;

export default CreateForder;
