import React from 'react';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import { Button, Form, FormGroup, Label, Input, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class ResetEncryptedRepoPasswordDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      newPassword: '',
      errMessage: '',
    };
  }

  onResetEncryptedRepoPasswordSubmit = () => {
    seafileAPI.resetEncryptedRepoPassword(this.props.repoID, this.state.newPassword).then((res) => {
      this.props.toggleDialog();
      toaster.success('Successfully reset password.');
    }).catch((error) => {
      if (error.response) {
        this.setState({
          errMessage: error.response.data.error_msg
        });
      }
    });
  }

  setNewPassword = (event) => {
    let password = event.target.value;
    this.state.newPassword = password;
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Please input new password')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Input type="password" onChange={(event) => this.setNewPassword(event)}/>
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.onResetEncryptedRepoPasswordSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ResetEncryptedRepoPasswordDialog.propTypes = propTypes;

export default ResetEncryptedRepoPasswordDialog;
