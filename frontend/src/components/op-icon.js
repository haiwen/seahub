import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../utils/utils';
import Icon from './icon';
import SfTooltip from './tooltip';

const propTypes = {
  id: PropTypes.string.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
  op: PropTypes.func,
  title: PropTypes.string,
  symbol: PropTypes.string.isRequired,
  tooltip: PropTypes.string,
  placement: PropTypes.string,
  modifiers: PropTypes.array,
};

class OpIcon extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { id, className, style, op, title, symbol, tooltip, placement, modifiers, ...others } = this.props;
    const iconWrapper = (
      <span
        {...others}
        id={id}
        className={className}
        style={style}
        role="button"
        tabIndex="0"
        aria-label={title}
        onClick={op}
        onKeyDown={Utils.onKeyDown}
      >
        <Icon symbol={symbol} />
      </span>
    );

    if (tooltip) {
      return (
        <>
          {iconWrapper}
          <SfTooltip
            target={id}
            placement={placement}
            modifiers={modifiers}
          >
            {tooltip}
          </SfTooltip>
        </>
      );
    }

    return iconWrapper;
  }
}

OpIcon.propTypes = propTypes;

export default OpIcon;
