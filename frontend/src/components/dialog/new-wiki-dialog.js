import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired,
};

class NewWikiDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isExist: false,
      name: '',
      repoID: '',
    };
    this.newName = React.createRef();
  }

  componentDidMount() {
    this.newName.focus();
    this.newName.setSelectionRange(0, -1);
  }

  inputNewName = (e) => {
    this.setState({
      name: e.target.value,
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    } 
  }

  handleSubmit = () => {
    let { isExist, name, repoID } = this.state;
    this.props.addWiki(isExist, name, repoID);
    this.props.toggleCancel();
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('New Wiki')}</ModalHeader>
        <ModalBody>
          <label className="form-label">{gettext('Name')}</label>
          <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newName = input;}} value={this.state.name} onChange={this.inputNewName}/>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

NewWikiDialog.propTypes = propTypes;

export default NewWikiDialog;
