import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { KeyCodes } from '../../../../../_basic';

import './index.css';

const Name = ({
  isEditing,
  option,
  onOpen,
  onClose,
  onToggleFreeze,
  onChange,
}) => {
  const [name, setName] = useState(option?.name || '');
  const ref = useRef(null);

  const onSave = useCallback(() => {
    let newName = name.trim();
    if (newName === option.name || newName === '') return;
    const newOption = Object.assign({}, option, { name: newName });
    onChange(newOption, () => {
      onToggleFreeze(false);
      onClose();
    }, () => {
      onOpen(option.id);
    });
  }, [name, onToggleFreeze, option, onChange, onOpen, onClose]);

  const onClick = useCallback((event) => {
    if ((ref.current && !ref.current.contains(event.target)) && isEditing) {
      onSave();
    }
  }, [isEditing, onSave]);

  const onNameChange = useCallback((event) => {
    const newName = event.target.value;
    if (newName === name) return;
    setName(newName);
  }, [name]);

  const onKeyDown = useCallback((event) => {
    if (event.keyCode === KeyCodes.Enter) {
      event.preventDefault();
      onSave();
    }
  }, [onSave]);

  const onToggle = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onOpen(option.id);
  }, [option, onOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', onClick);
    return () => {
      document.addEventListener('mousedown', onClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="sf-metadata-edit-option-name" style={{ width: 'calc(100% - 30px)' }} >
      {isEditing ?
        <Input
          className="sf-metadata-edit-option-name-input mx-2"
          type="text"
          value={name}
          onChange={onNameChange}
          onKeyDown={onKeyDown}
          onBlur={onSave}
          autoFocus
        />
        :
        <div className="sf-metadata-edit-option-name-value text-truncate" onClick={onToggle} title={name}>{name}</div>
      }
    </div>
  );
};

Name.propTypes = {
  isEditing: PropTypes.bool,
  option: PropTypes.object,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
  onToggleFreeze: PropTypes.func,
};

export default Name;
