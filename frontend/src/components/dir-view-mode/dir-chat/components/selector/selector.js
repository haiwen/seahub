import React, { useCallback, useRef, useState } from 'react';
import classnames from 'classnames';
import OptionEditor from '../../../../option-editor';
import SelectorDisplay from './selector-display';

import './index.css';

const Selector = ({
  value,
  options,
  onChange,
  className,
  editorClassName,
  isSearchEnabled,
  border,
  icon,
  displayBgColor,
  iconPlacement,
  placement,
  children,
}) => {
  const [isShowMenu, setIsShowMenu] = useState(false);

  const ref = useRef(null);

  const handleChange = useCallback((newValue) => {
    if (value !== newValue) {
      onChange(newValue);
    }
    setIsShowMenu(false);
  }, [value, onChange]);

  const onMenuToggle = useCallback(() => {
    setIsShowMenu(true);
  }, []);

  return (
    <>
      <SelectorDisplay
        innerRef={ref}
        onClick={onMenuToggle}
        className={classnames('o-hidden', className)}
        icon={icon}
        iconPlacement={iconPlacement}
        border={border}
        displayBgColor={displayBgColor}
      >
        {children}
      </SelectorDisplay>
      {isShowMenu && (
        <OptionEditor
          className={`sea-ai-chat-selector-display-editor ${editorClassName || ''} `}
          options={options}
          target={ref}
          isSearchEnabled={isSearchEnabled}
          value={value}
          placement={placement}
          onChange={handleChange}
          onToggle={() => setIsShowMenu(false)}
          isShowSearchIcon={true}
        />
      )}
    </>
  );
};

export default Selector;
