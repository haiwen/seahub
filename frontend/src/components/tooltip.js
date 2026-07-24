import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Tooltip as ReactstrapTooltip } from 'reactstrap';
import { getTooltipOpenState } from './tooltip-utils';

import '../css/tooltip.css';

const propTypes = {
  target: PropTypes.string.isRequired,
  placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  className: PropTypes.string,
  children: PropTypes.node,
  shortcut: PropTypes.arrayOf(PropTypes.string),
};

const Tooltip = ({
  target,
  placement = 'bottom',
  className,
  children,
  shortcut
}) => {

  const [isOpen, setIsOpen] = useState(false);
  const hasShortcut = Boolean(shortcut);

  const toggle = useCallback((event) => {
    setIsOpen((open) => getTooltipOpenState(open, event));
  }, []);

  const renderContent = () => {
    if (hasShortcut) {
      return (
        <div className="sf-tooltip-shortcut-inner">
          <span className="sf-tooltip-text">{children}</span>
          <span className="sf-tooltip-shortcut-keys">
            {shortcut.map((key, index) => (
              <span key={index} className="sf-tooltip-shortcut-key">
                {key}
              </span>
            ))}
          </span>
        </div>
      );
    }

    return children;
  };

  const tooltipProps = {
    target,
    placement,
    className: `sf-tooltip ${className ? className : ''}`,
    innerClassName: hasShortcut ? 'sf-tooltip-shortcut-inner' : '',
    fade: false,
    hideArrow: true,
    autohide: true,
    trigger: 'hover focus click',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, -2.5],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          boundariesElement: 'window',
        },
      }
    ],
  };

  return (
    <ReactstrapTooltip {...tooltipProps} isOpen={isOpen} toggle={toggle}>
      {renderContent()}
    </ReactstrapTooltip>
  );
};

Tooltip.propTypes = propTypes;

export default Tooltip;
