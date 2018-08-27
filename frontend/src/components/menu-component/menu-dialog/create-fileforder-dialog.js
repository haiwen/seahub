import React from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Col, FormText } from 'reactstrap';
const gettext = window.gettext;

class CreateFileForder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      parentPath: '',
      childName: ''
    };
    this.newInput = React.createRef()
  }

  handleChange = (e) => {
    this.setState({
      childName: e.target.value, 
    }) 
  }

  handleSubmit = () => {
    let path = this.state.parentPath + this.state.childName
    if (this.props.isFile) {
      this.props.onAddFile(path);
    } else {
      this.props.onAddFolder(path);
    }
  } 

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  }

  toggle = () => {
    if (this.props.isFile) {
      this.props.addFileCancel();
    } else {
      this.props.addFolderCancel();
    }
  }
  
  componentWillMount() {
    this.changeState(this.props.isFile);
  }

  componentDidMount() {
    if (this.props.currentNode.path === "/") {
      this.setState({parentPath: this.props.currentNode.path});
    } else {
      this.setState({parentPath: this.props.currentNode.path + "/"});
    }
    this.newInput.focus();
    this.newInput.setSelectionRange(0,0);
  }

  changeState(isFile) {
    if (isFile) {
      this.setState({childName: '.md'});
    } else{
      this.setState({childName: ""});
    }
  }

  componentWillReceiveProps(nextProps) {
    this.changeState(nextProps.isFile);
  }

  changeState(isFile) {
    if (isFile) {
      this.setState({childName: '.md'});
    } else{
      this.setState({childName: ""});
    }
  }


  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{this.props.isFile ? gettext("New File") : gettext("New Folder")}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup row>
              <Label sm={3}>Parent path: </Label>
              <Col sm={9} className="parent-path"><FormText>{this.state.parentPath}</FormText></Col>
            </FormGroup>
            <FormGroup row>
              <Label for="fileName" sm={3}>{gettext("Name")}: </Label>
              <Col sm={9}>
                <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input}} id="fileName" placeholder={gettext("newName")} value={this.state.childName} onChange={this.handleChange}/>
              </Col>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext("Submit")}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext("Cancel")}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default CreateFileForder;
