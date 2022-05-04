import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'reactstrap';

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
  }
  render() {
    const className = 'btn-icon';
    const btnContent = (
      <React.Fragment>
        <i className={this.props.icon}></i>
        <Tooltip
          toggle={this.toggle}
          delay={{show: 0, hide: 0}}
          target={this.props.id}
          placement='bottom'
          isOpen={this.state.tooltipOpen}>
          {this.props.text}
        </Tooltip>
      </React.Fragment>
    );
    if (this.props.tag && this.props.tag == 'a') {
      return (
        <Button
          id={this.props.id}
          className={className}
          tag="a"
          href={this.props.href}
          aria-label={this.props.text}
        >
          {btnContent}
        </Button>
      );
    } else {
      return (
        <Button
          id={this.props.id}
          className={className}
          onClick={this.props.onClick}
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
