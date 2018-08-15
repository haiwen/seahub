import React from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter } from 'reactstrap';

class AddFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filePath: ''
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.toggle = this.toggle.bind(this);
  }
 
  handleChange(e) {
    this.setState({
      filePath: e.target.value, 
    }) 
  }

  handleSubmit() {
    this.props.onSetFilePath(this.state.filePath);
  } 

  toggle() {
    this.props.toggleCancel();
  }

  render() {
    return (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{'Add a new File'}</ModalHeader>
        <ModalBody>
          <p>{"Enter the path for the new file"}</p>
          <Input placeholder="/wiki/name.md" value={this.state.value} onChange={this.handleChange} />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{"submit"}</Button>{' '}
          <Button color="secondary" onClick={this.toggle}>{"cancel"}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default AddFile;
