import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../utils/utils';
import { Tooltip } from 'reactstrap';
import Icon from './icon';

const propTypes = {
  id: PropTypes.string,
  className: PropTypes.string.isRequired,
  style: PropTypes.object,
  op: PropTypes.func,
  title: PropTypes.string,
  symbol: PropTypes.string,
  tooltip: PropTypes.string,
  placement: PropTypes.string,
};

class OpIcon extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false
    };
  }

  toggle = () => {
    this.setState({
      tooltipOpen: !this.state.tooltipOpen
    });
  };

  render() {
    const { id, className, style, op, title, symbol, tooltip, placement = 'bottom', ...others } = this.props;

    const iconElement = symbol ? (
      <Icon symbol={symbol} />
    ) : null;

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
        {iconElement}
      </span>
    );

    if (tooltip) {
      return (
        <>
          {iconWrapper}
          <Tooltip
            toggle={this.toggle}
            delay={{ show: 0, hide: 0 }}
            target={id}
            placement={placement}
            isOpen={this.state.tooltipOpen}
          >
            {tooltip}
          </Tooltip>
        </>
      );
    }

    return iconWrapper;
  }
}

OpIcon.propTypes = propTypes;

export default OpIcon;
