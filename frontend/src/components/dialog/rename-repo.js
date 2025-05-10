import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { validateName } from '../../utils/utils';
import { Button, Input, Label, Modal, ModalBody, ModalFooter, Alert } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  renameRepo: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class Rename extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: props.name,
      errMessage: '',
      isSubmitBtnActive: false
    };
  }

  handleChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({ isSubmitBtnActive: false });
    } else {
      this.setState({ isSubmitBtnActive: true });
    }

    this.setState({ name: e.target.value });
  };

  handleSubmit = () => {
    let name = this.state.name.trim();
    let { isValid, errMessage } = validateName(name);
    if (!isValid) {
      this.setState({ errMessage });
      return;
    }
    this.props.renameRepo(name);
    this.toggle();
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  toggle = () => {
    this.props.toggleDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Rename Library')}</SeahubModalHeader>
        <ModalBody>
          <Label for="repo-name">{gettext('Name')}</Label>
          <Input id="repo-name" onKeyDown={this.handleKeyDown} value={this.state.name} onChange={this.handleChange} />
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

Rename.propTypes = propTypes;

export default Rename;
