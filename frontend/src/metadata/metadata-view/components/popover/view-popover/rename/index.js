import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Input } from 'reactstrap';
import { CustomizePopover } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils';
import { isValidViewName } from '../../../../_basic';
import { isEnter } from '../../../../_basic/utils/hotkey';

import '../index.css';

const Rename = ({ value, target, otherViewsName, toggle, onSubmit }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const onToggle = useCallback(() => {
    toggle();
  }, [toggle]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const { isValid, message } = isValidViewName(inputValue, otherViewsName);
    if (!isValid) {
      setErrorMessage(message);
      inputRef.current.focus();
      return;
    }
    if (message === value) {
      onToggle();
      return;
    }
    onSubmit(message);
  }, [value, inputValue, otherViewsName, onSubmit, onToggle]);

  const onKeyDown = useCallback((event) => {
    if (isEnter(event)) {
      handleSubmit(event);
    }
  }, [handleSubmit]);

  return (
    <CustomizePopover
      className='sf-metadata-rename-view-popover'
      target={target}
      placement='right-start'
      hideArrow={true}
      fade={false}
      modifiers={{ preventOverflow: { boundariesElement: document.body } }}
      canHide={!errorMessage}
      hide={onToggle}
      hideWithEsc={onToggle}
    >
      <div className='sf-metadata-rename-view-popover-header'>
        {gettext('Rename view')}
      </div>
      <div className="seafile-divider dropdown-divider"></div>
      <div className='sf-metadata-rename-view-popover-body'>
        <Input
          innerRef={inputRef}
          className="sf-metadata-view-rename-input"
          value={inputValue}
          onChange={onChange}
          autoFocus={true}
          onBlur={handleSubmit}
          onKeyDown={onKeyDown}
        />
        {errorMessage && (<Alert color="danger" className="mt-2 mb-0">{errorMessage}</Alert>)}
      </div>
    </CustomizePopover>
  );
};

Rename.propTypes = {
  value: PropTypes.string,
  target: PropTypes.string.isRequired,
  otherViewsName: PropTypes.array,
  toggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default Rename;
