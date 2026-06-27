import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button, Form, Alert } from 'reactstrap';
import toaster from '../../toast';
import PasswordInput from './password-input';
import { userAPI } from '../../../utils/user-api';
import { gettext } from '../../../utils/constants';
import { Utils, validatePassword } from '../../../utils/utils';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func,
};

const UserUpdatePassword = ({ toggle }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmedNewPassword, setConfirmedNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [canSubmit, setCanSubmit] = useState(true);

  const updatePassword = () => {
    if (!currentPassword) {
      setErrorMessage(gettext('Current password cannot be blank'));
      return;
    }
    if (!newPassword) {
      setErrorMessage(gettext('Password cannot be blank'));
      return;
    }
    if (!confirmedNewPassword) {
      setErrorMessage(gettext('Please enter the password again'));
      return;
    }
    if (newPassword !== confirmedNewPassword) {
      setErrorMessage(gettext('Passwords don\'t match'));
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMessage(gettext('New password cannot be the same as old password'));
    }
    if (!validatePassword(newPassword)) {
      setErrorMessage(gettext('Password strength should be strong or very strong'));
      return;
    }
    setErrorMessage('');
    setCanSubmit(false);
    userAPI.resetPassword(currentPassword, newPassword).then(() => {
      toaster.success(gettext('Password updated'));
      toggle();
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      setCanSubmit(true);
    });
  };

  return (
    <Modal centered={true} isOpen={true} toggle={toggle}>
      <SeahubModalHeader toggle={toggle}>{gettext('Update password')}</SeahubModalHeader>
      <ModalBody>
        <Form>
          <PasswordInput
            value={currentPassword}
            labelValue={gettext('Current password')}
            enableCheckStrength={false}
            onChangeValue={setCurrentPassword}
          />
          <PasswordInput
            value={newPassword}
            labelValue={gettext('New password')}
            onChangeValue={setNewPassword}
          />
          <PasswordInput
            value={confirmedNewPassword}
            labelValue={gettext('Confirm password')}
            onChangeValue={setConfirmedNewPassword}
            enableCheckStrength={false}
          />
        </Form>
        {errorMessage && (
          <Alert color='danger'>{errorMessage}</Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color='secondary' onClick={toggle}>{gettext('Cancel')}</Button>
        <Button color="primary" disabled={!canSubmit} onClick={updatePassword}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

UserUpdatePassword.propTypes = propTypes;

export default UserUpdatePassword;
