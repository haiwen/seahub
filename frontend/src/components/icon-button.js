import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Tooltip } from 'reactstrap';
import Icon from './icon';
import { downloadFile, Utils } from "../utils/utils";

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
          isOpen={this.state.tooltipOpen}>
          {this.props.text}
        </Tooltip>
      </>
    );
    if (this.props.href) {
      return (
        <div
          id={this.props.id}
          className={classNames('file-toolbar-btn', { 'disabled': this.props.disabled })}
          aria-label={this.props.text}
          onClick={() => downloadFile(this.props.href)}
        >
          {btnContent}
        </div>
      );
    } else {
      return (
        <div
          id={this.props.id}
          className={classNames('file-toolbar-btn', { 'disabled': this.props.disabled })}
          onClick={this.props.disabled ? () => {} : this.props.onClick}
          aria-label={this.props.text}
        >
          {btnContent}
        </div>
      );
    }
  }
}
IconButton.propTypes = propTypes;

export default IconButton;
