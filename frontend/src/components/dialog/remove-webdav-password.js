import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../utils/constants';

const propTypes = {
  removePassword: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired
};

class RemoveWebdavPassword extends Component {

  constructor(props) {
    super(props);
    this.state = {
      btnDisabled: false
    };
  }

  submit = () => {
    this.setState({
      btnDisabled: true
    });

    this.props.removePassword();
  };

  render() {
    const { toggle } = this.props;

    return (
      <Modal centered={true} isOpen={true} toggle={toggle}>
        <SeahubModalHeader toggle={toggle}>{gettext('Delete WebDAV Password')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to delete WebDAV password?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit} disabled={this.state.btnDisabled}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

RemoveWebdavPassword.propTypes = propTypes;

export default RemoveWebdavPassword;
