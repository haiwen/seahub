import React, { useState, useEffect, useRef } from 'react';
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
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const turnstileRef = useRef(null);

  useEffect(() => {
    return () => {
      if (turnstileWidgetId !== null && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId);
      }
    };
  }, [turnstileWidgetId]);

  const renderTurnstileWidget = () => {
    if (window.app && window.app.pageOptions && window.app.pageOptions.enableTurnstile && turnstileRef.current) {
      const renderTurnstile = () => {
        if (window.turnstile) {
          try {
            const widgetId = window.turnstile.render(turnstileRef.current, {
              sitekey: window.app.pageOptions.turnstileSiteKey,
              callback: (token) => {
                setTurnstileToken(token);
              }
            });
            setTurnstileWidgetId(widgetId);
          } catch (e) {
            //
          }
        }
      };

      if (window.turnstile) {
        renderTurnstile();
      } else if (window.turnstileLoadPromise) {
        window.turnstileLoadPromise.then(() => {
          renderTurnstile();
        });
      }
    }
  };

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
      return;
    }
    if (!validatePassword(newPassword)) {
      setErrorMessage(gettext('Password strength should be strong or very strong'));
      return;
    }
    if (window.app && window.app.pageOptions && window.app.pageOptions.enableTurnstile && !turnstileToken) {
      setErrorMessage(gettext('Please complete the Turnstile challenge'));
      return;
    }

    setErrorMessage('');
    setCanSubmit(false);

    userAPI.resetPassword(currentPassword, newPassword, turnstileToken).then(() => {
    }).then(() => {
      toaster.success(gettext('Password updated'));
      toggle();
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      setCanSubmit(true);
      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
        setTurnstileToken('');
      }
    });
  };

  return (
    <Modal centered={true} isOpen={true} toggle={toggle} onOpened={renderTurnstileWidget}>
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
        {window.app && window.app.pageOptions && window.app.pageOptions.enableTurnstile && (
          <div ref={turnstileRef} className="mt-2"></div>
        )}
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
