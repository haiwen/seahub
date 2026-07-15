import React, { useCallback, useRef, useState } from 'react';
import classnames from 'classnames';
import SyncOptionsEditor from '../../../../sync-option-editor';
import { gettext } from '../../../../../utils/constants';
import SelectorDisplay from './selector-display';

import './index.css';

const SyncSelector = ({ icon, className, value, title, onChange, children, onSearch, disabled = false }) => {
  const [isShowSelector, setIsShowSelector] = useState(false);

  const ref = useRef();

  const openSelector = useCallback(() => {
    if (disabled) {
      return;
    }
    setIsShowSelector(true);
  }, [disabled]);

  const handleChange = useCallback((newValue) => {
    onChange && onChange(newValue);
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
        tip={isShowSelector ? '' : title}
        tipPlacement="top-start"
      >
        {children}
      </SelectorDisplay>
      {isShowSelector && (
        <SyncOptionsEditor
          className="sea-ai-chat-selector-display-editor"
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
