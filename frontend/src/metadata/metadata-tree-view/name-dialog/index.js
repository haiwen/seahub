import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import { KeyCodes } from '../../../constants';
import { gettext } from '../../metadata-view/utils';
import { Utils } from '../../../utils/utils';

const NameDialog = ({ value: oldName, title, onSubmit, onToggle }) => {
  const [name, setName] = useState(oldName || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const onChange = useCallback((event) => {
    const value = event.target.value;
    if (value === name) return;
    setName(value);
  }, [name]);

  const validate = useCallback((name) => {
    if (typeof name !== 'string') {
      return { isValid: false, message: gettext('Name should be string') };
    }
    name = name.trim();
    if (name === '') {
      return { isValid: false, message: gettext('Name is required') };
    }
    if (name.includes('/')) {
      return { isValid: false, message: gettext('Name cannot contain slash') };
    }
    if (name.includes('\\')) {
      return { isValid: false, message: gettext('Name cannot contain backslash') };
    }
    return { isValid: true, message: name };
  }, []);

  const submit = useCallback(() => {
    setSubmitting(true);
    const { isValid, message } = validate(name);
    if (!isValid) {
      setErrorMessage(message);
      setSubmitting(false);
      return;
    }
    if (message === oldName) {
      onToggle();
      return;
    }
    onSubmit(message, () => {
      onToggle();
    }, (error) => {
      const errorMsg = Utils.getErrorMsg(error);
      setErrorMessage(errorMsg);
      setSubmitting(false);
    });
  }, [validate, name, oldName, onToggle, onSubmit]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === KeyCodes.Enter) {
      event.preventDefault();
      submit();
    }
  }, [submit]);

  useEffect(() => {
    document.addEventListener('keydown', onHotKey);
    return () => {
      document.removeEventListener('keydown', onHotKey);
    };
  }, [onHotKey]);

  return (
    <Modal isOpen={true} toggle={onToggle} autoFocus={false} className="sf-metadata-view-name-dialog">
      <ModalHeader toggle={onToggle}>{title}</ModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Label>{gettext('Name')}</Label>
            <Input autoFocus={true} value={name} onChange={onChange}/>
            <Input style={{ display: 'none' }} />
          </FormGroup>
        </Form>
        {errorMessage && <Alert color="danger" className="mt-2">{errorMessage}</Alert>}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" disabled={isSubmitting} onClick={onToggle}>{gettext('Cancel')}</Button>
        <Button color="primary" disabled={isSubmitting} onClick={submit}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

NameDialog.propTypes = {
  value: PropTypes.string,
  title: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default NameDialog;
