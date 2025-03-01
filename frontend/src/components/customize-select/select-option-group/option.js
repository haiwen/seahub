import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

class Option extends Component {

  onSelectOption = (value, event) => {
    if (this.props.supportMultipleSelect) {
      event.stopPropagation();
    }
    this.props.onSelectOption(value, event);
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
        className={classnames('seafile-select-option', { 'seafile-select-option-active': this.props.isActive })}
        onClick={this.onSelectOption.bind(this, this.props.value)}
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
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
  onSelectOption: PropTypes.func,
  supportMultipleSelect: PropTypes.bool,
  disableHover: PropTypes.bool,
};

export default Option;
