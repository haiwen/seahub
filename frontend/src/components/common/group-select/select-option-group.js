import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SearchInput from '../../search-input';
import Option from './option';
import KeyCodes from '../../../constants/keyCodes';

import './select-option-group.css';

const OPTION_HEIGHT = 32;

class SelectOptionGroup extends Component {

  constructor(props) {
    super(props);
    this.state = {
      searchVal: '',
      activeIndex: -1,
      disableHover: false,
    };
    this.filterOptions = null;
    this.timer = null;
    this.searchInputRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onHotKey);
    document.addEventListener('mousedown', this.handleDocumentClick);
    setTimeout(() => {
      this.resetMenuStyle();
    }, 1);
  }

  componentWillUnmount() {
    this.filterOptions = null;
    this.timer && clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onHotKey);
    document.removeEventListener('mousedown', this.handleDocumentClick);
  }

  handleDocumentClick = (e) => {
    this.props.onClickOutside(e);
  };

  resetMenuStyle = () => {
    const { isInModal, position } = this.props;
    const { top, height } = this.optionGroupRef.getBoundingClientRect();
    if (isInModal) {
      if (position.y + position.height + height > window.innerHeight) {
        this.optionGroupRef.style.top = (position.y - height) + 'px';
      }
      this.optionGroupRef.style.opacity = 1;
    }
    else {
      if (height + top > window.innerHeight) {
        const borderWidth = 2;
        this.optionGroupRef.style.top = -1 * (height + borderWidth) + 'px';
      }
    }
  };

  onHotKey = (event) => {
    const keyCode = event.keyCode;
    if (keyCode === KeyCodes.UpArrow) {
      this.onPressUp();
    } else if (keyCode === KeyCodes.DownArrow) {
      this.onPressDown();
    } else if (keyCode === KeyCodes.Enter) {
      let option = this.filterOptions && this.filterOptions[this.state.activeIndex];
      if (option) {
        this.props.onSelectOption(option);
      }
    } else if (keyCode === KeyCodes.Tab || keyCode === KeyCodes.Escape) {
      this.props.closeSelect();
    }
  };

  onPressUp = () => {
    if (this.state.activeIndex > 0) {
      this.setState({ activeIndex: this.state.activeIndex - 1 }, () => {
        this.scrollContent();
      });
    }
  };

  onPressDown = () => {
    if (this.filterOptions && this.state.activeIndex < this.filterOptions.length - 1) {
      this.setState({ activeIndex: this.state.activeIndex + 1 }, () => {
        this.scrollContent();
      });
    }
  };

  onMouseDown = (e) => {
    const { isInModal } = this.props;
    // prevent event propagation when click option or search input
    if (isInModal) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  scrollContent = () => {
    const { offsetHeight, scrollTop } = this.optionGroupContentRef;
    this.setState({ disableHover: true });
    this.timer = setTimeout(() => {
      this.setState({ disableHover: false });
    }, 500);
    if (this.state.activeIndex * OPTION_HEIGHT === 0) {
      this.optionGroupContentRef.scrollTop = 0;
      return;
    }

    if (this.state.activeIndex * OPTION_HEIGHT < scrollTop) {
      this.optionGroupContentRef.scrollTop = scrollTop - OPTION_HEIGHT;
    }
    else if (this.state.activeIndex * OPTION_HEIGHT > offsetHeight + scrollTop) {
      this.optionGroupContentRef.scrollTop = scrollTop + OPTION_HEIGHT;
    }
  };

  changeIndex = (index) => {
    this.setState({ activeIndex: index });
  };

  onChangeSearch = (searchVal) => {
    this.setState({ searchVal: searchVal || '', activeIndex: -1, });
  };

  clearValue = () => {
    this.setState({ searchVal: '', activeIndex: -1, });
  };

  renderOptGroup = (searchVal) => {
    let { noOptionsPlaceholder, onSelectOption, selectedOptions } = this.props;
    this.filterOptions = this.props.getFilterOptions(searchVal);
    if (this.filterOptions.length === 0) {
      return (
        <div className="none-search-result">{noOptionsPlaceholder}</div>
      );
    }
    return this.filterOptions.map((option, index) => {
      const isSelected = selectedOptions.some(item => item.id === option.id);
      return (
        <Option
          key={`${option.id}-${index}`}
          index={index}
          isActive={this.state.activeIndex === index}
          option={option}
          onSelectOption={onSelectOption}
          changeIndex={this.changeIndex}
          disableHover={this.state.disableHover}
        >
          <div className='option-label'>{option.label}</div>
          {isSelected && <i className="sf2-icon-tick text-gray font-weight-bold"></i>}
        </Option>
      );
    });
  };

  render() {
    const { searchPlaceholder, top, left, minWidth, isInModal, position, className } = this.props;
    let { searchVal } = this.state;
    let style = { top: top || 0, left: left || 0 };
    if (minWidth) {
      style = { top: top || 0, left: left || 0, minWidth };
    }
    if (isInModal) {
      style = {
        position: 'fixed',
        left: position.x,
        top: position.y + position.height,
        minWidth: position.width,
        opacity: 0,
      };
    }
    return (
      <div
        className={classnames('pt-0 option-group', className ? 'option-group-' + className : '')}
        ref={(ref) => this.optionGroupRef = ref}
        style={style}
        onMouseDown={this.onMouseDown}
      >
        <div className="option-group-search position-relative">
          <SearchInput
            className="option-search-control"
            autoFocus={isInModal}
            placeholder={searchPlaceholder}
            onChange={this.onChangeSearch}
            ref={this.searchInputRef}
          />
        </div>
        <div className="option-group-content" ref={(ref) => this.optionGroupContentRef = ref}>
          {this.renderOptGroup(searchVal)}
        </div>
      </div>
    );
  }
}

SelectOptionGroup.propTypes = {
  top: PropTypes.number,
  left: PropTypes.number,
  minWidth: PropTypes.number,
  options: PropTypes.array,
  onSelectOption: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  noOptionsPlaceholder: PropTypes.string,
  onClickOutside: PropTypes.func.isRequired,
  closeSelect: PropTypes.func.isRequired,
  getFilterOptions: PropTypes.func.isRequired,
  selectedOptions: PropTypes.array,
  isInModal: PropTypes.bool,
  position: PropTypes.object,
  className: PropTypes.string,
};

export default SelectOptionGroup;
