import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../utils/utils';
import Icon from './icon';
import Tooltip from './tooltip';

const propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  op: PropTypes.func,
  onClick: PropTypes.func,
  onKeyDown: PropTypes.func,
  title: PropTypes.string,
  symbol: PropTypes.string.isRequired,
  tooltip: PropTypes.string,
  placement: PropTypes.string,
  modifiers: PropTypes.array,
  iconRef: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  innerRef: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  disableTooltip: PropTypes.bool,
};

class OpIcon extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      id, className, style, op, onClick, onKeyDown, title, symbol, tooltip, placement, modifiers,
      iconRef, innerRef, disableTooltip = false, ...others
    } = this.props;
    const iconWrapper = (
      <span
        {...others}
        id={id}
        ref={iconRef || innerRef}
        className={className}
        style={style}
        onClick={op || onClick}
        tabIndex="0"
        role="button"
        aria-label={title || tooltip}
        onKeyDown={onKeyDown || (innerRef ? undefined : Utils.onKeyDown)}
      >
        <Icon symbol={symbol} />
      </span>
    );

    if (tooltip) {
      return (
        <>
          {iconWrapper}
          {!disableTooltip && (
            <Tooltip
              target={id}
              placement={placement}
              modifiers={modifiers}
            >
              {tooltip}
            </Tooltip>
          )}
        </>
      );
    }

    return iconWrapper;
  }
}

OpIcon.propTypes = propTypes;

export default OpIcon;
