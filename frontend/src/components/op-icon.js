import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../utils/utils';
import Icon from './icon';

const propTypes = {
  className: PropTypes.string.isRequired,
  style: PropTypes.object,
  op: PropTypes.func,
  title: PropTypes.string.isRequired,
  symbol: PropTypes.string
};
class OpIcon extends React.Component {

  render() {
    const { className, style, op, title, symbol, ...others } = this.props;
    const iconProps = {
      tabIndex: '0',
      role: 'button',
      className: className,
      style: style || null,
      title: title,
      'aria-label': title,
      onClick: op,
      onKeyDown: Utils.onKeyDown,
      ...others
    };

    return symbol ? (
      <span {...iconProps}>
        <Icon symbol={symbol} />
      </span>
    ) : (
      <i {...iconProps}></i>
    );
  }
}

OpIcon.propTypes = propTypes;

export default OpIcon;
