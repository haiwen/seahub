import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  currentNode: PropTypes.object,
  onRename: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

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
    let flag = this.validateParamsInput();
    if (flag) {
      this.props.onRename(this.state.newName);
    }
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
      newName: this.props.currentNode.object.name
    });
  }

  componentDidMount() {
    let currentNode = this.props.currentNode;
    this.changeState(currentNode);
    this.newInput.focus();
    let type = currentNode.object.type;
    if (type === 'file') {
      var endIndex = currentNode.object.name.lastIndexOf('.md');
      this.newInput.setSelectionRange(0, endIndex, 'forward');
    } else {
      this.newInput.setSelectionRange(0, -1);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.changeState(nextProps.currentNode);
  }

  changeState = (currentNode) => {
    let name = currentNode.object.name;
    this.setState({newName: name});
  }

  validateParamsInput = () => {
    let newName = this.state.newName.trim();
    if (!newName) {
      let errMessage = gettext('Name is required.');
      toaster.danger(errMessage);
      return false;
    }

    if (newName.indexOf('/') > -1) {
      let errMessage = gettext('Name should not include ' + '\'/\'' + '.');
      toaster.danger(errMessage);
      return false;
    }

    return true;
  }

  render() {
    let type = this.props.currentNode.object.type;
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

Rename.propTypes = propTypes;

export default Rename;
