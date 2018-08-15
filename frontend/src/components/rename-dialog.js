import React from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter } from 'reactstrap';

class Rename extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newName: '',
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.toggle = this.toggle.bind(this);
  }
  
  handleChange(e) {
    this.setState({
      newName: e.target.value, 
    }); 
  }

  handleSubmit() {
    this.props.onRename(this.state.newName);
  } 

  toggle() {
    this.props.toggleCancel();
  }

  render() {
    return (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{this.props.type === 'file' ? 'Rename File' : 'Rename Folder' }</ModalHeader>
        <ModalBody>
          <p>{this.props.type === 'file' ? "Enter the new file name.": 'Enter the new folder name.'}</p>
          <Input placeholder={this.props.preName} value={this.state.newName} onChange={this.handleChange} />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>Submit</Button>{' '}
          <Button color="secondary" onClick={this.toggle}>Cancel</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default Rename;
