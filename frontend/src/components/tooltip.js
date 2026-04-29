import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';

import '../css/tooltip.css';

const propTypes = {
  target: PropTypes.string.isRequired,
  placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  className: PropTypes.string,
  children: PropTypes.node,
  shortcut: PropTypes.arrayOf(PropTypes.string),
};

const SfTooltip = ({
  target,
  placement = 'bottom',
  className,
  children,
  shortcut
}) => {

  const hasShortcut = Boolean(shortcut);

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
    delay: { show: 0, hide: 0 },
    hideArrow: true,
    autohide: false,
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
    <UncontrolledTooltip {...tooltipProps}>
      {renderContent()}
    </UncontrolledTooltip>
  );
};

SfTooltip.propTypes = propTypes;

export default SfTooltip;
