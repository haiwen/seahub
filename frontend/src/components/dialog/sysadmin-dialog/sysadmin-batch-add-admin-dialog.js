
import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addAdminInBatch: PropTypes.func.isRequired,
};

class SysAdminBatchAddAdminDialog extends React.Component {
  constructor(props) {
    super(props);
    this.fileInputRef = React.createRef();
    this.state = {
      errorMsg: '',
      emailString: '',
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  inputEmail = (e) => {
    let emailString = e.target.value.trim();
    this.setState({
      emailString: emailString,
      errorMsg: ''
    });
  }

  addAdminInBatch = () => {
    this.props.addAdminInBatch(this.state.emailString);
  }

  render() {
    let { errorMsg, emailString } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add admins')}</ModalHeader>
        <ModalBody>
          <Label className="font-weight-bold">{gettext('Enter')}</Label>
          <Input placeholder={gettext('Emails, separared by \' , \'')} value={emailString} onChange={this.inputEmail}/>
          <Alert color="light">{gettext('Tip: the emails should be the users already added.')}</Alert>
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.addAdminInBatch}>{gettext('Add')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminBatchAddAdminDialog.propTypes = propTypes;

export default SysAdminBatchAddAdminDialog;
