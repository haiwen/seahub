import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Input } from 'reactstrap';
import { isEnter } from '../../utils/hotkey';

const InlineNameEditor = forwardRef(({ name, className, onSubmit }, ref) => {
  const [inputValue, setInputValue] = useState(name || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleInputSubmit = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onSubmit(inputValue);
  }, [inputValue, onSubmit]);

  const onKeyDown = useCallback((event) => {
    if (isEnter(event)) {
      handleInputSubmit(event);
    }
  }, [handleInputSubmit]);

  useImperativeHandle(ref, () => {
    return {
      inputRef,
    };
  }, []);

  return (
    <Input
      autoFocus
      className={classnames('sf-metadata-view-input', className)}
      innerRef={inputRef}
      value={inputValue}
      onChange={(handleInputChange)}
      onBlur={handleInputSubmit}
      onKeyDown={onKeyDown}
    />
  );
});

InlineNameEditor.propTypes = {
  name: PropTypes.string,
  onSubmit: PropTypes.func,
};

export default InlineNameEditor;
