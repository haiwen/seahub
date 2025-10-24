import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../utils/utils';
import Icon from './icon';

const propTypes = {
  className: PropTypes.string.isRequired,
  op: PropTypes.func,
  title: PropTypes.string.isRequired,
  symbol: PropTypes.string
};
class OpIcon extends React.Component {

  render() {
    const { className, op, title, symbol } = this.props;
    const iconProps = {
      tabIndex: '0',
      role: 'button',
      className: className,
      title: title,
      'aria-label': title,
      onClick: op,
      onKeyDown: Utils.onKeyDown
    };

    return symbol ? (
      <span {...iconProps}>
        <Icon symbol={symbol} />
      </span>
    ) : (
      <i {...iconProps} />
    );
  }
}

OpIcon.propTypes = propTypes;

export default OpIcon;
