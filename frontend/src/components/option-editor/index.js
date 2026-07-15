import React, { useCallback, useRef } from 'react';
import classnames from 'classnames';
import CustomizePopover from '../customize-popover';
import OptionEditorContainer from './option-editor-container';

import './index.css';

const OptionsEditor = ({
  id,
  target,
  isMultiple = false,
  isSearchEnabled = true,
  sameWidthWithTarget = false,
  checkPlacement = 'right',
  optionClassName = '',
  contentClassName = '',
  placeholder,
  placement,
  emptyTip,
  value,
  className,
  options = [],
  optionHeight,
  modifiers,
  onChange,
  onToggle,
  onCreate,
  isShowSearchIcon,
}) => {
  const optionEditorContainerRef = useRef(null);

  const handleClose = useCallback(() => {
    if (isMultiple) {
      const value = optionEditorContainerRef.current.getValue();
      onChange(value);
    }
    onToggle && onToggle();
  }, [isMultiple, onChange, onToggle]);

  return (
    <CustomizePopover
      target={target}
      popoverClassName={classnames('option-editor-popover', className)}
      placement={placement}
      modifiers={modifiers}
      sameWidthWithTarget={sameWidthWithTarget}
      hidePopover={handleClose}
      hidePopoverWithEsc={handleClose}
    >
      <OptionEditorContainer
        id={id}
        ref={optionEditorContainerRef}
        isMultiple={isMultiple}
        placeholder={placeholder}
        isSearchEnabled={isSearchEnabled}
        checkPlacement={checkPlacement}
        optionClassName={optionClassName}
        className={contentClassName}
        emptyTip={emptyTip}
        value={value}
        options={options}
        optionHeight={optionHeight}
        onChange={onChange}
        onToggle={onToggle}
        onCreate={onCreate}
        isShowSearchIcon={isShowSearchIcon}
      />
    </CustomizePopover>
  );
};

export default OptionsEditor;
