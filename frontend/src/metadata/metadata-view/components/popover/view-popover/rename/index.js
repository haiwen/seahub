import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Form, Input, UncontrolledPopover } from 'reactstrap';
import { CustomizePopover } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils';
import { isValidViewName } from '../../../../_basic';
import { useMetadata } from '../../../../../hooks';

import '../index.css';

const Rename = ({ value, target, toggle, onSubmit }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);
  const { navigation } = useMetadata();

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const onToggle = useCallback(() => {
    console.log('onToggle')
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const { isValid, message } = isValidViewName(inputValue, []);
    if (!isValid) {
      setErrorMessage(message);
      inputRef.current.focus();
      return;
    }
    onSubmit(message);
  }, [inputValue, navigation, onSubmit]);

  // useEffect(() => {
  //   const handleClickOutSide = (event) => {
  //     if (inputRef.current && !inputRef.current.contains(event.target)) {
  //       toggle(event);
  //     }
  //   };

  //   if (inputRef.current) {
  //     inputRef.current.select();
  //     document.addEventListener('mousedown', handleClickOutSide);
  //   }

  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutSide);
  //   };
  // }, [toggle]);

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
          className='sf-metadata-view-input'
          type='text'
          id="rename-input"
          name='rename'
          value={inputValue}
          onChange={onChange}
          autoFocus={true}
          onBlur={handleSubmit}
        />
      </div>
    </CustomizePopover>
  );
};

Rename.propTypes = {
  value: PropTypes.string,
  target: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default Rename;
