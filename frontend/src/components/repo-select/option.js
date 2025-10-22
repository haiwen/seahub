import React, { Component } from 'react';
import PropTypes from 'prop-types';

class Option extends Component {

  onSelectOption = (e) => {
    e.stopPropagation();
    this.props.onSelectOption(this.props.option);
  };

  onMouseEnter = () => {
    if (!this.props.disableHover) {
      this.props.changeIndex(this.props.index);
    }
  };

  onMouseLeave = () => {
    if (!this.props.disableHover) {
      this.props.changeIndex(-1);
    }
  };

  render() {
    return (
      <div
        className={this.props.isActive ? 'option option-active' : 'option'}
        onClick={this.onSelectOption}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >{this.props.children}
      </div>
    );
  }
}

Option.propTypes = {
  index: PropTypes.number,
  isActive: PropTypes.bool,
  changeIndex: PropTypes.func,
  option: PropTypes.object,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
  onSelectOption: PropTypes.func,
  disableHover: PropTypes.bool,
};

export default Option;
