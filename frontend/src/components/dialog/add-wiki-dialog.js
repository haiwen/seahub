import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label } from 'reactstrap';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired,
};

class AddWikiDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      isSubmitBtnActive: false,
    };
  }

  inputNewName = (e) => {
    this.setState({
      name: e.target.value,
      isSubmitBtnActive: !!e.target.value.trim(),
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  };

  handleSubmit = () => {
    const wikiName = this.state.name.trim();
    if (!wikiName) return;
    this.props.addWiki(wikiName);
    this.props.toggleCancel();
  };

  toggle = () => {
    this.props.toggleCancel();
  };

  render() {
    return (
      <Modal isOpen={true} autoFocus={false} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add Wiki')}</ModalHeader>
        <ModalBody>
          <Label>{gettext('Name')}</Label>
          <Input onKeyDown={this.handleKeyDown} autoFocus={true} value={this.state.name} onChange={this.inputNewName}/>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddWikiDialog.propTypes = propTypes;

export default AddWikiDialog;
