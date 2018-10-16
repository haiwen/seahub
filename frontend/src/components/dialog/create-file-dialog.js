import React from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Col, FormText } from 'reactstrap';
import { gettext } from '../../utils/constants';

class CreateFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      parentPath: '',
      childName: props.fileType,
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
    this.props.onAddFile(path);
  } 

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  }

  toggle = () => {
    this.props.addFileCancel();
  }

  componentDidMount() {
    if (this.props.parentPath === "/") {
      this.setState({parentPath: this.props.parentPath});
    } else {
      this.setState({parentPath: this.props.parentPath + "/"});
    }
    this.newInput.focus();
    this.newInput.setSelectionRange(0,0);
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext("New File")}</ModalHeader>
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

export default CreateFile;
