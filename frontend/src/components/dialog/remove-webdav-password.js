import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Alert, Button, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  removePassword: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired
};

class RemoveWebdavPassword extends Component {

  constructor(props) {
    super(props);
    this.state = {
      btnDisabled: false,
      errMsg: ''
    };
  }

  submit = () => {

    this.setState({
      btnDisabled: true
    });

    this.props.removePassword();
  }

  render() {
    const { toggle } = this.props;

    return (
      <Modal centered={true} isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}>{gettext('Remove WebDav Password')}</ModalHeader>
        {this.state.errMsg && <Alert color="danger" className="m-0 mt-2">{gettext(this.state.errMsg)}</Alert>}
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit} disabled={this.state.btnDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

RemoveWebdavPassword.propTypes = propTypes;

export default RemoveWebdavPassword;
