import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Col, FormText } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  fileType: PropTypes.string,
  parentPath: PropTypes.string.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  addFolderCancel: PropTypes.func.isRequired,
};

class CreateForder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      parentPath: '',
      childName: ''
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
    let parentPath = this.props.parentPath;
    if (parentPath[parentPath.length - 1] === '/') {  // mainPanel
      this.setState({parentPath: parentPath});
    } else {
      this.setState({parentPath: parentPath + '/'}); // sidePanel
    }
    this.newInput.focus();
    this.newInput.setSelectionRange(0,0);
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Folder')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup row>
              <Label sm={3}>Parent path: </Label>
              <Col sm={9} className="parent-path"><FormText>{this.state.parentPath}</FormText></Col>
            </FormGroup>
            <FormGroup row>
              <Label for="fileName" sm={3}>{gettext('Name')}: </Label>
              <Col sm={9}>
                <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} id="fileName" placeholder={gettext('newName')} value={this.state.childName} onChange={this.handleChange}/>
              </Col>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateForder.propTypes = propTypes;

export default CreateForder;
