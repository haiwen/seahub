import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Alert } from 'reactstrap';

const propTypes = {
  currentNode: PropTypes.object,
  onRename: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  checkDuplicatedName: PropTypes.func.isRequired,
};

class Rename extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newName: '',
      errMessage: '',
    };
    this.newInput = React.createRef();
  }

  componentWillMount() {
    this.setState({newName: this.props.currentNode.object.name});
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
  
  handleChange = (e) => {
    this.setState({newName: e.target.value}); 
  }

  handleSubmit = () => {
    let { isValid, errMessage } = this.validateInput();
    if (!isValid) {
      this.setState({errMessage : errMessage});
    } else {
      let isDuplicated = this.checkDuplicatedName();
      if (isDuplicated) {
        let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
        errMessage = errMessage.replace('{name}', Utils.HTMLescape(this.state.newName));
        this.setState({errMessage: errMessage});
      } else {
        this.props.onRename(this.state.newName);
      }
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

  changeState = (currentNode) => {
    let name = currentNode.object.name;
    this.setState({newName: name});
  }

  validateInput = () => {
    let newName = this.state.newName.trim();
    let isValid = true;
    let errMessage = '';
    if (!newName) {
      isValid = false;
      errMessage = gettext('Name is required.');
      return { isValid, errMessage };
    }

    if (newName.indexOf('/') > -1) {
      isValid = false;
      errMessage = gettext('Name should not include ' + '\'/\'' + '.');
      return { isValid, errMessage };
    }

    return { isValid, errMessage };
  }

  checkDuplicatedName = () => {
    let isDuplicated = this.props.checkDuplicatedName(this.state.newName);
    return isDuplicated;
  }

  render() {
    let type = this.props.currentNode.object.type;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{type === 'file' ? gettext('Rename File') : gettext('Rename Folder') }</ModalHeader>
        <ModalBody>
          <p>{type === 'file' ? gettext('New file name'): gettext('New folder name')}</p>
          <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} placeholder="newName" value={this.state.newName} onChange={this.handleChange} />
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

Rename.propTypes = propTypes;

export default Rename;
