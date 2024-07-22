import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip, DropdownItem } from 'reactstrap';
import { Icon } from 'seafile/sf-metadata-ui-component';

export default class ColumnDropdownItem extends Component {

  static propTypes = {
    onClick: PropTypes.func.isRequired,
    onMouseEnter: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
    id: PropTypes.string.isRequired,
    iconSvg: PropTypes.string,
    iconClassName: PropTypes.string,
    menuText: PropTypes.string.isRequired,
    disabledText: PropTypes.string.isRequired,
    className: PropTypes.string,
  };

  static defaultProps = {
    onClick: () => {},
    onMouseEnter: () => {},
    disabled: false,
    className: '',
  };

  state = {
    canToolTip: false,
  };

  componentDidMount() {
    if (this.props.disabled) {
      this.setState({ canToolTip: true });
    }
  }

  onClick = (e) => {
    e.preventDefault();
  };

  renderIcon = () => {
    const { iconSvg, iconClassName } = this.props;
    if (iconClassName) {
      return <i className={iconClassName}></i>;
    }
    if (iconSvg) {
      return <Icon symbol={iconSvg} />;
    }
    return null;
  };

  render() {
    const { disabled, id, menuText, disabledText, className } = this.props;

    if (!disabled) {
      return (
        <DropdownItem
          onClick={this.props.onClick}
          onMouseEnter={this.props.onMouseEnter}
          className={className}
        >
          {this.renderIcon()}
          <span className="item-text">{menuText}</span>
        </DropdownItem>
      );
    }

    return (
      <DropdownItem
        className={`${className} disabled`}
        toggle={true}
        onClick={this.onClick}
        onMouseEnter={this.props.onMouseEnter}
        id={id}
      >
        {this.renderIcon()}
        <span className="item-text">{menuText}</span>
        {this.state.canToolTip &&
          <UncontrolledTooltip
            placement='right'
            target={id}
            fade={false}
            delay={{ show: 0, hide: 0 }}
          >
            {disabledText}
          </UncontrolledTooltip>
        }
      </DropdownItem>
    );
  }
}
