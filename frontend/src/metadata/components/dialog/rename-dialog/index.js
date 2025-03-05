import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Alert } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../../../utils/constants';
import { validateName } from '../../../../utils/utils';
import { isEnter } from '../../../../utils/hotkey';

const RenameDialog = ({ isDir, oldName, onSubmit, onCancel }) => {
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
    if (isEnter(e)) {
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
      <SeahubModalHeader toggle={onCancel}>
        {isDir ? gettext('Rename Folder') : gettext('Rename File')}
      </SeahubModalHeader>
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

RenameDialog.propTypes = {
  isDir: PropTypes.bool.isRequired,
  oldName: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default RenameDialog;
