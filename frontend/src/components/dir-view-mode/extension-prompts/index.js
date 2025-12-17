import React, { useCallback } from 'react';
import Icon from '../../icon';
import { gettext } from '../../../utils/constants';

import './index.css';

const ExtensionPrompts = ({ onExtendedProperties }) => {
  const handlePromptsClick = useCallback(() => {
    onExtendedProperties();
  }, [onExtendedProperties]);

  return (
    <div
      className='extension-prompts-container'
      aria-label={gettext('Extension Prompts')}
      onClick={handlePromptsClick}
    >
      <div className='extension-prompts-icon-wrapper'>
        <Icon symbol="megaphone" className='extension-prompts-icon' aria-label={gettext('Megaphone Icon')} />
      </div>
      <div className='extension-prompts-content'>
        <p>
          {gettext('Turn on extensible properties and views to experience a new way of managing files')}
        </p>
      </div>
    </div>
  );
};

export default ExtensionPrompts;
