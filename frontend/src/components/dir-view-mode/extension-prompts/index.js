import React, { useState } from 'react';
import Icon from '../../icon';
import { gettext } from '../../../utils/constants';

import './index.css';

const ExtensionPrompts = () => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      className='extension-prompts-container'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={gettext('Extension Prompts')}
    >
      <div className='extension-prompts-icon-wrapper'>
        <Icon
          symbol={isHovered ? 'color-bell' : 'bell'}
          className='extension-prompts-icon'
          aria-label={isHovered ? gettext('Color Bell Icon') : gettext('Bell Icon')}
        />
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
