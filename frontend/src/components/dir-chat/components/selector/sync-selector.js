import React, { useCallback, useRef, useState } from 'react';
import classnames from 'classnames';
import { gettext } from '@/utils/constants';
import CustomizePopover from '../../../customize-popover';
import SyncOptionsEditor from '../../../sync-option-editor';
import SelectorDisplay from './selector-display';

import './index.css';

const SyncSelector = ({ icon, className, value, title, onChange, children, onSearch, disabled = false, menu }) => {
  const [isShowSelector, setIsShowSelector] = useState(false);
  const [isShowMenu, setIsShowMenu] = useState(false);

  const ref = useRef();

  const openSelector = useCallback(() => {
    if (disabled) {
      return;
    }
    if (menu) {
      setIsShowMenu(true);
      return;
    }
    setIsShowSelector(true);
  }, [disabled, menu]);

  const closeMenu = useCallback(() => {
    setIsShowMenu(false);
  }, []);

  const openSearch = useCallback(() => {
    setIsShowMenu(false);
    setIsShowSelector(true);
  }, []);

  const handleChange = useCallback((newValue) => {
    onChange && onChange(newValue);
    setIsShowSelector(false);
  }, [onChange]);

  const onToggle = useCallback(() => {
    setIsShowSelector(false);
  }, []);

  return (
    <>
      <SelectorDisplay
        innerRef={ref}
        onClick={openSelector}
        icon={icon}
        className={classnames(className, { disabled })}
        tip={isShowSelector || isShowMenu ? '' : title}
        tipPlacement="top-start"
      >
        {children}
      </SelectorDisplay>
      {isShowMenu && menu && (
        <CustomizePopover
          target={ref}
          popoverClassName="sea-ai-chat-attach-menu-popover"
          placement="top-start"
          hidePopover={closeMenu}
          hidePopoverWithEsc={closeMenu}
        >
          {menu({ closeMenu, openSearch })}
        </CustomizePopover>
      )}
      {isShowSelector && (
        <SyncOptionsEditor
          className="sea-ai-chat-selector-display-editor sea-ai-chat-file-selector-editor"
          target={ref}
          isMultiple={true}
          placeholder={gettext('Search')}
          emptyTip={gettext('No results')}
          value={Array.isArray(value) ? value : []}
          placement="top-start"
          onChange={handleChange}
          onToggle={onToggle}
          onSearch={onSearch}
          isShowSearchIcon={true}
        />
      )}
    </>
  );

};

export default SyncSelector;
