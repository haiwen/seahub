import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ModalPortal from '../modal-portal';
import SelectOptionGroup from './select-option-group.js';
import { Utils } from '../../utils/utils.js';

// import './index.css';

class RepoSelect extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowSelectOptions: false
    };
  }

  onSelectToggle = (event) => {
    event.preventDefault();
    if (this.state.isShowSelectOptions) event.stopPropagation();
    let eventClassName = event.target.className;
    if (eventClassName.indexOf('sf2-icon-close') > -1 || eventClassName === 'option-group-search') return;
    if (event.target.value === '') return;
    this.setState({
      isShowSelectOptions: !this.state.isShowSelectOptions
    });
  };

  onClickOutside = (event) => {
    if (this.props.isShowSelected && event.target.className.includes('icon-fork-number')) {
      return;
    }
    if (!this.selector.contains(event.target)) {
      this.closeSelect();
    }
  };

  closeSelect = () => {
    this.setState({ isShowSelectOptions: false });
  };

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.selectedOptions.length !== this.props.selectedOptions.length) {
      // when selectedOptions change and dom rendered, calculate top
      setTimeout(() => {
        this.forceUpdate();
      }, 1);
    }
  }

  getSelectedOptionTop = () => {
    if (!this.selector) return 38;
    const { height } = this.selector.getBoundingClientRect();
    return height;
  };

  getFilterOptions = (searchValue) => {
    const { options } = this.props;
    const validSearchVal = searchValue.trim().toLowerCase();
    if (!validSearchVal) return options || [];
    return options.filter(option => option.name.toLowerCase().includes(validSearchVal));
  };

  onSelectOption = (option) => {
    this.props.onSelectOption(option);
    this.setState({ isShowSelectOptions: false });
  };

  render() {
    let { className, selectedOptions, options, placeholder, searchPlaceholder, noOptionsPlaceholder, isInModal } = this.props;
    const selectOption = selectedOptions[0];
    const iconUrl = selectOption && Utils.getLibIconUrl(selectOption);
    return (
      <div
        ref={(node) => this.selector = node}
        className={classnames('group-select custom-select',
          { 'focus': this.state.isShowSelectOptions },
          className
        )}
        onClick={this.onSelectToggle}>
        <div className="selected-option">
          {selectedOptions.length > 0 ?
            <span className="selected-option-show">
              {selectedOptions.map(item =>
                <span key={item.id} className="selected-option-item mr-1 px-1">
                  <img src={iconUrl} width={'24px'} alt="" className='mr-2'></img>
                  <span className='selected-option-item-name'>{item.name}</span>
                </span>
              )}
            </span>
            :
            <span className="select-placeholder">{placeholder}</span>
          }
          <i className="sf3-font-down sf3-font"></i>
        </div>
        {this.state.isShowSelectOptions && !isInModal && (
          <SelectOptionGroup
            selectedOptions={selectedOptions}
            top={this.getSelectedOptionTop()}
            options={options}
            onSelectOption={this.onSelectOption}
            searchPlaceholder={searchPlaceholder}
            noOptionsPlaceholder={noOptionsPlaceholder}
            onClickOutside={this.onClickOutside}
            closeSelect={this.closeSelect}
            getFilterOptions={this.getFilterOptions}
          />
        )}
        {this.state.isShowSelectOptions && isInModal && (
          <ModalPortal>
            <SelectOptionGroup
              className={className}
              selectedOptions={selectedOptions}
              position={this.selector.getBoundingClientRect()}
              isInModal={isInModal}
              top={this.getSelectedOptionTop()}
              options={options}
              onSelectOption={this.onSelectOption}
              searchPlaceholder={searchPlaceholder}
              noOptionsPlaceholder={noOptionsPlaceholder}
              onClickOutside={this.onClickOutside}
              closeSelect={this.closeSelect}
              getFilterOptions={this.getFilterOptions}
            />
          </ModalPortal>
        )}
      </div>
    );
  }
}

RepoSelect.propTypes = {
  className: PropTypes.string,
  selectedOptions: PropTypes.array,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  onSelectOption: PropTypes.func,
  onDeleteOption: PropTypes.func,
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  noOptionsPlaceholder: PropTypes.string,
  isInModal: PropTypes.bool, // if select component in a modal (option group need ModalPortal to show)
};

export default RepoSelect;
