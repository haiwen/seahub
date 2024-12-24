import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  restoreRepo: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired
};

class ConfirmRestoreRepo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      btnDisabled: false
    };
  }

  action = () => {
    this.setState({
      btnDisabled: true
    });
    this.props.restoreRepo();
  };

  render() {
    const { toggle } = this.props;
    return (
      <Modal centered={true} isOpen={true} toggle={toggle}>
        <SeahubModalHeader toggle={toggle}>{gettext('Restore Library')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to restore this library?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.action} disabled={this.state.btnDisabled}>{gettext('Restore')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ConfirmRestoreRepo.propTypes = propTypes;

export default ConfirmRestoreRepo;
