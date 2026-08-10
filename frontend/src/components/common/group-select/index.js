import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Popover } from 'reactstrap';
import ModalPortal from '../../modal-portal';
import SelectOptionGroup from './select-option-group.js';
import Icon from '../../icon.js';
import { Utils } from '../../../utils/utils';
import SelectDropdownIndicator from '../../select-dropdown-indicator';

import './index.css';

class GroupSelect extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowSelectOptions: false
    };
  }

  toggle = () => {
    this.setState({ isShowSelectOptions: !this.state.isShowSelectOptions });
  };

  closeSelect = () => {
    this.setState({ isShowSelectOptions: false });
  };

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.selectedOptions.length !== this.props.selectedOptions.length) {
      setTimeout(() => { this.forceUpdate(); }, 1);
    }
  }

  getFilterOptions = (searchValue) => {
    const { options } = this.props;
    const validSearchVal = searchValue.trim().toLowerCase();
    if (!validSearchVal) return options || [];
    return options.filter(option => option.name.toLowerCase().includes(validSearchVal));
  };

  render() {
    let { className, selectedOptions, options, placeholder, searchPlaceholder, noOptionsPlaceholder, isInModal } = this.props;
    const { isShowSelectOptions } = this.state;
    return (
      <>
        <div
          id="group-select"
          ref={(node) => this.selector = node}
          className={classnames('group-select sf-select',
            { 'focus': isShowSelectOptions },
            className
          )}
          tabIndex={0}
          role="combobox"
          aria-expanded={isShowSelectOptions}
          aria-haspopup="listbox"
          aria-label={placeholder}
          aria-controls="group-select-listbox"
          onKeyDown={Utils.onKeyDown}
          onClick={this.toggle}
        >
          <div className="selected-option">
            {selectedOptions.length > 0 ?
              <span className="selected-option-show">
                {selectedOptions.map(item =>
                  <span key={item.id} className="selected-option-item">
                    <span className='selected-option-item-name'>{item.name}</span>
                    <span className="d-flex align-items-center" onClick={(e) => { e.stopPropagation(); this.props.onDeleteOption(item); }}><Icon symbol="close" /></span>
                  </span>
                )}
              </span>
              :
              <span className="select-placeholder">{placeholder}</span>
            }
            <SelectDropdownIndicator />
          </div>
        </div>
        {!isInModal && (
          <Popover
            isOpen={isShowSelectOptions}
            target="group-select"
            placement="bottom-start"
            hideArrow={true}
            fade={false}
          >
            <SelectOptionGroup
              selectedOptions={selectedOptions}
              options={options}
              onSelectOption={this.props.onSelectOption}
              searchPlaceholder={searchPlaceholder}
              noOptionsPlaceholder={noOptionsPlaceholder}
              onClickOutside={(e) => {
                const optionGroup = document.querySelector('.option-group');
                if (optionGroup && optionGroup.contains(e.target)) return;
                this.closeSelect();
              }}
              closeSelect={this.closeSelect}
              getFilterOptions={this.getFilterOptions}
            />
          </Popover>
        )}
        {isShowSelectOptions && isInModal && (
          <ModalPortal>
            <SelectOptionGroup
              className={className}
              selectedOptions={selectedOptions}
              position={this.selector && this.selector.getBoundingClientRect()}
              isInModal={isInModal}
              top={this.selector ? this.selector.getBoundingClientRect().height : 38}
              options={options}
              onSelectOption={this.props.onSelectOption}
              searchPlaceholder={searchPlaceholder}
              noOptionsPlaceholder={noOptionsPlaceholder}
              onClickOutside={(e) => {
                const optionGroup = document.querySelector('.option-group');
                if (optionGroup && optionGroup.contains(e.target)) return;
                this.closeSelect();
              }}
              closeSelect={this.closeSelect}
              getFilterOptions={this.getFilterOptions}
            />
          </ModalPortal>
        )}
      </>
    );
  }
}

GroupSelect.propTypes = {
  className: PropTypes.string,
  selectedOptions: PropTypes.array,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  onSelectOption: PropTypes.func,
  onDeleteOption: PropTypes.func,
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  noOptionsPlaceholder: PropTypes.string,
  isInModal: PropTypes.bool,
};

export default GroupSelect;
