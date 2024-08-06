import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import Icon from './icon';

const propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  tag: PropTypes.string,
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
    if (this.props.tag && this.props.tag == 'a') {
      return (
        <div
          id={this.props.id}
          className='file-toolbar-btn'
          tag="a"
          href={this.props.href}
          aria-label={this.props.text}
        >
          {btnContent}
        </div>
      );
    } else {
      return (
        <div
          id={this.props.id}
          className='file-toolbar-btn'
          onClick={this.props.onClick}
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
