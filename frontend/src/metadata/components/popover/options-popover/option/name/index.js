import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { KeyCodes } from '../../../../../../constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../../../store/operations';
import toaster from '../../../../../../components/toast';
import { gettext } from '../../../../../../utils/constants';

import './index.css';

const Name = ({
  isEditing,
  isPredefined,
  option,
  onOpen,
  onClose,
  onToggleFreeze,
  onChange,
  onRemoveEmptyOption,
}) => {
  const [name, setName] = useState(option?.name || '');
  const ref = useRef(null);

  useEffect(() => {
    setName(option?.name || '');
  }, [option?.name]);

  const onSave = useCallback(() => {
    let newName = name.trim();

    if (newName === '') {
      onToggleFreeze(false);
      onClose();

      if (option.name === '' && onRemoveEmptyOption) {
        onRemoveEmptyOption(option.id);
      } else if (option.name !== '') {
        toaster.danger(gettext('Name is required'));
        setName(option.name);
      }
      return;
    }

    if (newName === option.name) {
      onToggleFreeze(false);
      onClose();
      return;
    }

    const newOption = Object.assign({}, option, { name: newName });
    onChange(newOption, COLUMN_DATA_OPERATION_TYPE.RENAME_OPTION, () => {
      onToggleFreeze(false);
      onClose();
    }, () => {
      onOpen(option.id);
    });
  }, [name, onToggleFreeze, option, onChange, onOpen, onClose, onRemoveEmptyOption]);

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
    if (isPredefined) return;
    onOpen(option.id);
  }, [isPredefined, option, onOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClick]);

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
  onRemoveEmptyOption: PropTypes.func,
};

export default Name;
