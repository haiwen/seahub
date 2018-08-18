import React from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Col, FormText } from 'reactstrap';

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
    let type = this.props.currentNode.type;
    let path = this.state.parentPath + this.state.childName
    if (type === "file") {
      this.props.onAddFile(path);
    } else {
      this.props.onAddFolder(path);
    }
  } 

  toggle = () => {
    let type = this.props.currentNode.type;
    if (type === "file") {
      this.props.addFileCancel();
    } else {
      this.props.addFolderCancel();
    }
  }

  componentDidMount() {
    this.changeState(this.props.isFile);
    this.newInput.focus();
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      parentPath: this.props.currentNode.path + "/"
    });
    this.changeState(nextProps.isFile);
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
        <ModalHeader toggle={this.toggle}>{this.props.isFile ? 'Add a new File' : 'Add a new Folder'}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup row>
              <Label for="filePath" sm={2}>ParentPath: </Label>
              <Col sm={10} className="parent-path"><FormText>{this.state.parentPath}</FormText></Col>
            </FormGroup>
            <FormGroup row>
              <Label for="fileName" sm={2}>Name: </Label>
              <Col sm={10}>
                <Input innerRef={input => {this.newInput = input}} id="fileName" placeholder="newName" />
              </Col>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{"submit"}</Button>{' '}
          <Button color="secondary" onClick={this.toggle}>{"cancel"}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default CreateFileForder;
