import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClickOutside from '../../click-outside';
import SearchInput from '../../search-input';
import Option from './option';
import { KeyCodes } from '../../../constants';

import './index.css';

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
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onHotKey);
    setTimeout(() => {
      this.resetMenuStyle();
    }, 1);
  }

  componentWillUnmount() {
    this.filterOptions = null;
    this.timer && clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onHotKey);
  }

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
        this.props.onSelectOption(option.value);
        if (!this.props.supportMultipleSelect) {
          this.props.closeSelect();
        }
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
    let value = searchVal || '';
    if (value !== this.state.searchVal) {
      this.setState({ searchVal: value, activeIndex: -1, });
    }
  };

  renderOptGroup = (searchVal) => {
    let { noOptionsPlaceholder, onSelectOption, value } = this.props;
    this.filterOptions = this.props.getFilterOptions(searchVal);
    if (this.filterOptions.length === 0) {
      return (
        <div className="none-search-result">{noOptionsPlaceholder}</div>
      );
    }
    return this.filterOptions.map((opt, i) => {
      let key = opt.value.column ? opt.value.column.key : i;
      let isActive = this.state.activeIndex === i;
      const isSelected = value && opt.value === value.value;
      return (
        <Option
          key={key}
          index={i}
          isActive={isActive}
          value={opt.value}
          onSelectOption={onSelectOption}
          changeIndex={this.changeIndex}
          supportMultipleSelect={this.props.supportMultipleSelect}
          disableHover={this.state.disableHover}
        >
          {opt.label}
          {isSelected && <i className="sf2-icon-tick"></i>}
        </Option>
      );
    });
  };

  render() {
    const { searchable, searchPlaceholder, top, left, minWidth, value, isShowSelected, isInModal, position,
      className, addOptionAble, component } = this.props;
    const { AddOption } = component || {};
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
      <ClickOutside onClickOutside={this.props.onClickOutside}>
        <div
          className={classnames('seafile-option-group', className ? 'seafile-option-group-' + className : '', {
            'pt-0': isShowSelected,
            'create-new-seafile-option-group': addOptionAble,
          })}
          ref={(ref) => this.optionGroupRef = ref}
          style={style}
          onMouseDown={this.onMouseDown}
        >
          {isShowSelected &&
            <div className="editor-list-delete mb-2" onClick={(e) => e.stopPropagation()}>{value.label || ''}</div>
          }
          {searchable && (
            <div className="seafile-option-group-search">
              <SearchInput
                className="option-search-control"
                placeholder={searchPlaceholder}
                onChange={this.onChangeSearch}
                autoFocus={true}
              />
            </div>
          )}
          <div className="seafile-option-group-content" ref={(ref) => this.optionGroupContentRef = ref}>
            {this.renderOptGroup(searchVal)}
          </div>
          {addOptionAble && AddOption}
        </div>
      </ClickOutside>
    );
  }
}

SelectOptionGroup.propTypes = {
  top: PropTypes.number,
  left: PropTypes.number,
  minWidth: PropTypes.number,
  options: PropTypes.array,
  onSelectOption: PropTypes.func,
  searchable: PropTypes.bool,
  addOptionAble: PropTypes.bool,
  component: PropTypes.object,
  searchPlaceholder: PropTypes.string,
  noOptionsPlaceholder: PropTypes.string,
  onClickOutside: PropTypes.func.isRequired,
  closeSelect: PropTypes.func.isRequired,
  getFilterOptions: PropTypes.func.isRequired,
  supportMultipleSelect: PropTypes.bool,
  value: PropTypes.object,
  isShowSelected: PropTypes.bool,
  stopClickEvent: PropTypes.bool,
  isInModal: PropTypes.bool,
  position: PropTypes.object,
  className: PropTypes.string,
};

export default SelectOptionGroup;
