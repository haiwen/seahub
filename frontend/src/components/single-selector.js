import React, { Component } from 'react';
import PropTypes from 'prop-types';

import '../css/single-selector.css';

const propTypes = {
  isDropdownToggleShown: PropTypes.bool.isRequired,
  currentSelectedOption: PropTypes.object.isRequired,
  options: PropTypes.array.isRequired,
  selectOption: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func
};

class Selector extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isPopoverOpen: false
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.handleOutsideClick);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (e) => {
    const { isPopoverOpen } = this.state;
    if (isPopoverOpen && !this.selector.contains(e.target)) {
      this.togglePopover();
    }
  };

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen
    }, () => {
      if (this.props.toggleItemFreezed) {
        this.props.toggleItemFreezed(this.state.isPopoverOpen);
      }
    });
  };

  onToggleClick = (e) => {
    e.stopPropagation();
    this.togglePopover();
  };

  selectItem = (e, targetItem) => {
    e.stopPropagation();
    this.props.selectOption(targetItem);
    this.togglePopover();
  };

  render() {
    const { isPopoverOpen } = this.state;
    const { currentSelectedOption, options, isDropdownToggleShown } = this.props;
    return (
      <div className="sf-single-selector position-relative">
        <span className="cur-option" onClick={this.onToggleClick}>
          {currentSelectedOption.text}
          {isDropdownToggleShown && <i className="fas fa-caret-down ml-2 toggle-icon"></i>}
        </span>
        {isPopoverOpen && (
          <div className="options-container position-absolute rounded shadow mt-1" ref={ref => this.selector = ref}>
            <ul className="option-list list-unstyled py-3 o-auto">
              {options.map((item, index) => {
                return (
                  <li key={index} className="option-item h-6 py-1 px-3 d-flex justify-content-between align-items-center" onClick={(e) => {this.selectItem(e, item);}}>
                    <span className="option-item-text flex-shrink-0 mr-3">{item.text}</span>
                    <i className={`sf2-icon-tick text-gray font-weight-bold ${item.isSelected ? '' : 'invisible'}`}></i>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

Selector.propTypes = propTypes;

export default Selector;
