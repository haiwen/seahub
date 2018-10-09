import React from 'react';
import { gettext } from '../../../utils/constants';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter } from 'reactstrap';

class Rename extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newName: '',
    };
    this.newInput = React.createRef();
  }
  
  handleChange = (e) => {
    this.setState({
      newName: e.target.value, 
    }); 
  }

  handleSubmit = () => {
    this.props.onRename(this.state.newName);
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    } 
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  componentWillMount() {
    this.setState({
      newName: this.props.currentNode.name
    });
  }

  componentDidMount() {
    this.changeState(this.props.currentNode);
    this.newInput.focus();
    let type = this.props.currentNode.type;
    if (type === 'file') {
      var endIndex = this.props.currentNode.name.lastIndexOf('.md');
      this.newInput.setSelectionRange(0, endIndex, 'forward');
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
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{type === 'file' ? gettext('Rename File') : gettext('Rename Folder') }</ModalHeader>
        <ModalBody>
          <p>{type === 'file' ? gettext('Enter the new file name:'): gettext('Enter the new folder name:')}</p>
          <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} placeholder="newName" value={this.state.newName} onChange={this.handleChange} />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export default Rename;
