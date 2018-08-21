import React from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter } from 'reactstrap';

class Rename extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newName: '',
    };
    this.newInput = React.createRef();
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

  componentWillMount() {
    this.setState({
      newName: this.props.currentNode.name
    })
  }

  componentDidMount() {
    this.changeState(this.props.currentNode);
    this.newInput.focus();
    let type = this.props.currentNode.type;
    if (type === "file") {
      var endIndex = this.props.currentNode.name.lastIndexOf(".md");
      this.newInput.setSelectionRange(0, endIndex, "forward");
    } else {
      this.newInput.setSelectionRange(0, -1);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.changeState(nextProps.currentNode);
  }

  changeState(currentNode) {
    this.setState({newName: currentNode.name});
  }

  render() {
    let type = this.props.currentNode.type;
    let preName = this.props.currentNode.name;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{type === 'file' ? 'Rename File' : 'Rename Folder' }</ModalHeader>
        <ModalBody>
          <p>{type === 'file' ? "Enter the new file name:": 'Enter the new folder name:'}</p>
          <Input innerRef={input => {this.newInput = input}} placeholder="newName" value={this.state.newName} onChange={this.handleChange} />
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
