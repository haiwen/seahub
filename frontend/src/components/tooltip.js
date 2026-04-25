import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import Icon from './icon';

import '../css/tooltip.css';
import { gettext } from '@/utils/constants';

const propTypes = {
  target: PropTypes.string.isRequired,
  placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  className: PropTypes.string,
  // Basic tooltip
  children: PropTypes.node,
  // Shortcut variant
  shortcut: PropTypes.arrayOf(PropTypes.string),
  // Confirm variant
  confirmText: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  // Popper.js modifiers
  modifiers: PropTypes.array,
};

/**
 * Tooltip component wrapping reactstrap's Tooltip with three variants:
 * - Basic: Simple text tooltip
 * - Shortcut: Text with keyboard shortcut hint
 * - Confirm: Text with confirmation button
 */
const SfTooltip = ({
  target,
  placement = 'bottom',
  className,
  children,
  shortcut,
  confirmText,
  onConfirm,
  modifiers,
}) => {

  const handleConfirm = (e) => {
    e.stopPropagation();
    onConfirm?.();
  };

  const hasShortcut = Boolean(shortcut);
  const hasConfirm = Boolean(confirmText);

  const renderContent = () => {
    if (hasConfirm) {
      return (
        <div className="sf-tooltip-confirm-content">
          <div className="sf-tooltip-text">{children}</div>
          <div className="sf-tooltip-confirm">
            <span onClick={handleConfirm}>{gettext('Known')}</span>
          </div>
        </div>
      );
    }

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
