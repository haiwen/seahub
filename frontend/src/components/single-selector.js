import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import { Utils } from '../utils/utils';
import Icon from './icon';

import '../css/single-selector.css';

const propTypes = {
  customSelectorToggle: PropTypes.object,
  menuCustomClass: PropTypes.string,
  isDropdownToggleShown: PropTypes.bool,
  currentSelectedOption: PropTypes.object,
  options: PropTypes.array.isRequired,
  selectOption: PropTypes.func.isRequired,
  operationBeforeSelect: PropTypes.func,
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
    if (this.props.operationBeforeSelect) {
      this.props.operationBeforeSelect(targetItem);
    } else {
      this.props.selectOption(targetItem);
    }
    this.togglePopover();
  };

  render() {
    const { isPopoverOpen } = this.state;
    const { currentSelectedOption, options, isDropdownToggleShown, menuCustomClass = '',
      customSelectorToggle = null
    } = this.props;
    return (
      <div className="sf-single-selector position-relative">
        <div
          role='button'
          tabIndex="0"
          aria-label={gettext('Toggle selector menu')}
          onClick={this.onToggleClick}
          onKeyDown={Utils.onKeyDown}
        >
          {customSelectorToggle ? customSelectorToggle : (
            <span className="cur-option">
              {currentSelectedOption ? currentSelectedOption.text : ''}
              {isDropdownToggleShown && <Icon symbol="down" className="toggle-icon ml-1" />}
            </span>
          )}
        </div>
        {isPopoverOpen && (
          <div className={`options-container position-absolute rounded shadow mt-1 ${menuCustomClass}`} ref={ref => this.selector = ref}>
            <ul className="option-list list-unstyled py-3 o-auto" role="menu">
              {options.map((item, index) => {
                return (
                  <li
                    key={index}
                    tabIndex="0"
                    role="menuitem"
                    className="option-item h-6 py-1 px-3 d-flex justify-content-between align-items-center"
                    onClick={(e) => {this.selectItem(e, item);}}
                    onKeyDown={Utils.onKeyDown}
                  >
                    <span className="option-item-text flex-shrink-0 mr-3">{item.text}</span>
                    <Icon symbol="check-thin" className={item.isSelected ? '' : 'invisible'} />
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
