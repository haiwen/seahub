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

const UserSetPassword = ({ toggle }) => {
  const [password, setPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
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

  const submitPassword = () => {
    if (!password) {
      setErrorMessage(gettext('Password cannot be blank'));
      return;
    }
    if (!confirmedPassword) {
      setErrorMessage(gettext('Please enter the password again'));
      return;
    }
    if (password !== confirmedPassword) {
      setErrorMessage(gettext('Passwords don\'t match'));
      return;
    }
    if (!validatePassword(password)) {
      setErrorMessage(gettext('Password strength should be strong or very strong'));
      return;
    }
    if (window.app && window.app.pageOptions && window.app.pageOptions.enableTurnstile && !turnstileToken) {
      setErrorMessage(gettext('Please complete the Turnstile challenge'));
      return;
    }

    setErrorMessage('');
    setCanSubmit(false);
    userAPI.resetPassword(null, password, turnstileToken).then(() => {
      toaster.success(gettext('Password set'));
      location.reload();
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
      <SeahubModalHeader toggle={toggle}>{gettext('Set password')}</SeahubModalHeader>
      <ModalBody>
        <Form>
          <PasswordInput
            value={password}
            labelValue={gettext('Password')}
            onChangeValue={setPassword}
          />
          <PasswordInput
            value={confirmedPassword}
            labelValue={gettext('Confirm password')}
            onChangeValue={setConfirmedPassword}
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
        <Button color="primary" disabled={!canSubmit} onClick={submitPassword}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

UserSetPassword.propTypes = propTypes;

export default UserSetPassword;
