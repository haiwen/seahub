import React from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter } from 'reactstrap';

class AddFolder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dirPath: ''
    }
    
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.toggle = this.toggle.bind(this);  
  }

  handleChange(e) {
    this.setState({
      dirPath: e.target.value, 
    }) 
  }

  handleSubmit() {
    this.props.onSetFolderPath(this.state.dirPath);
  } 

  toggle() {
    this.props.toggleCancel();
  }

  render() {
    return (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{'Add a new Folder'}</ModalHeader>
        <ModalBody>
          <p>{"Enter the path for the new folder"}</p>
          <Input placeholder="/wiki/demo" value={this.state.dirPath} onChange={this.handleChange} />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{"submit"}</Button>{' '}
          <Button color="secondary" onClick={this.toggle}>{"cancel"}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default AddFolder;
