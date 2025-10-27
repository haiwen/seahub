import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Tooltip } from 'reactstrap';
import Icon from './icon';

const propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  href: PropTypes.string
};

class IconButton extends React.Component {

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
    const btnContent = (
      <>
        <Icon symbol={this.props.icon} />
        <Tooltip
          toggle={this.toggle}
          delay={{ show: 0, hide: 0 }}
          target={this.props.id}
          placement='bottom'
          isOpen={this.state.tooltipOpen}
        >
          {this.props.text}
        </Tooltip>
      </>
    );
    if (this.props.href) {
      return (
        <a
          id={this.props.id}
          className={classNames('file-toolbar-btn', { 'disabled': this.props.disabled })}
          aria-label={this.props.text}
          href={this.props.href}
        >
          {btnContent}
        </a>
      );
    } else {
      return (
        <Button
          id={this.props.id}
          className={classNames('border-0 p-0 bg-transparent file-toolbar-btn', { 'disabled': this.props.disabled })}
          onClick={this.props.disabled ? () => {} : this.props.onClick}
          aria-label={this.props.text}
        >
          {btnContent}
        </Button>
      );
    }
  }
}
IconButton.propTypes = propTypes;

export default IconButton;
