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
      isSubmitBtnActive: false,
    };
  }

  inputNewName = (e) => {
    if (!event.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

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
      <Modal isOpen={true} autoFocus={false}>
        <ModalHeader toggle={this.toggle}>{gettext('New Wiki')}</ModalHeader>
        <ModalBody>
          <label className="form-label">{gettext('Name')}</label>
          <Input onKeyPress={this.handleKeyPress} autoFocus={true} value={this.state.name} onChange={this.inputNewName}/>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

NewWikiDialog.propTypes = propTypes;

export default NewWikiDialog;
