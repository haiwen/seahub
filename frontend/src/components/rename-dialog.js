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

  componentDidMount() {
    this.changeState(this.props.currentNode);
  }

  componentWillReceiveProps(nextProps) {
    this.changeState(nextProps.currentNode);
  }

  changeState(currentNode) {
    if (currentNode.type === "file") {
      this.setState({newName: '.md'});
    } else{
      this.setState({newName: ""});
    }
  }

  render() {
    let type = this.props.currentNode.type;
    let preName = this.props.currentNode.name;
    return (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{type === 'file' ? 'Rename File' : 'Rename Folder' }</ModalHeader>
        <ModalBody>
          <p>{type === 'file' ? "Enter the new file name:": 'Enter the new folder name:'}</p>
          <Input placeholder="newName" value={this.state.newName} onChange={this.handleChange} />
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
