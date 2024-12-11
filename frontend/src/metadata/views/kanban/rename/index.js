import React, { useState, useRef, useEffect } from 'react';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Alert } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import { validateName } from '../../../../utils/utils';

const Rename = ({ isDir, oldName, onSubmit, onCancel }) => {
  const [newName, setNewName] = useState('');
  const [errMessage, setErrMessage] = useState('');
  const [isSubmitBtnActive, setIsSubmitBtnActive] = useState(false);
  const newInput = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value.trim();
    setNewName(value);
    setIsSubmitBtnActive(!!value);
  };

  const handleSubmit = () => {
    const { isValid, errMessage } = validateName(newName);
    if (!isValid) {
      setErrMessage(errMessage);
      return;
    }

    onSubmit(newName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const onAfterModelOpened = () => {
    if (!newInput.current) return;
    newInput.current.focus();
    if (!isDir) {
      const endIndex = oldName.lastIndexOf('.');
      if (endIndex !== -1) {
        newInput.current.setSelectionRange(0, endIndex, 'forward');
      } else {
        newInput.current.setSelectionRange(0, oldName.length, 'forward');
      }
    } else {
      newInput.current.setSelectionRange(0, -1);
    }
  };

  useEffect(() => {
    setNewName(oldName);
  }, [oldName]);

  return (
    <Modal isOpen={true} toggle={onCancel} onOpened={onAfterModelOpened}>
      <ModalHeader toggle={onCancel}>
        {isDir ? gettext('Rename Folder') : gettext('Rename File')}
      </ModalHeader>
      <ModalBody>
        <p>{isDir ? gettext('New folder name') : gettext('New file name')}</p>
        <Input
          onKeyDown={handleKeyDown}
          innerRef={newInput}
          value={newName}
          onChange={handleChange}
        />
        {errMessage && <Alert color="danger" className="mt-2">{errMessage}</Alert>}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onCancel}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={handleSubmit} disabled={!isSubmitBtnActive}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

Rename.propTypes = {
  isDir: PropTypes.bool.isRequired,
  oldName: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default Rename;
