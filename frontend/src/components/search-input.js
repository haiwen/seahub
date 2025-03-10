import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../utils/utils';

const propTypes = {
  placeholder: PropTypes.string,
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func,
  wait: PropTypes.number,
  disabled: PropTypes.bool,
  style: PropTypes.object,
  isClearable: PropTypes.bool,
  clearValue: PropTypes.func,
  clearClassName: PropTypes.string,
  components: PropTypes.object,
  value: PropTypes.string,
};

class SearchInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      searchValue: props.value || '',
    };
    this.isInputtingChinese = false;
    this.timer = null;
    this.inputRef = null;
  }

  componentDidMount() {
    if (this.props.autoFocus && this.inputRef && this.inputRef !== document.activeElement) {
      setTimeout(() => {
        this.inputRef.focus();
      }, 0);
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({ searchValue: nextProps.value });
    }
  }

  componentWillUnmount() {
    this.timer && clearTimeout(this.timer);
    this.timer = null;
    this.inputRef = null;
  }

  onCompositionStart = () => {
    this.isInputtingChinese = true;
  };

  onChange = (e) => {
    this.timer && clearTimeout(this.timer);
    const { onChange, wait = 100 } = this.props;
    let text = e.target.value;
    this.setState({ searchValue: text || '' }, () => {
      if (this.isInputtingChinese) return;
      this.timer = setTimeout(() => {
        onChange && onChange(this.state.searchValue.trim());
      }, wait);
    });
  };

  onCompositionEnd = (e) => {
    this.isInputtingChinese = false;
    this.onChange(e);
  };

  clearSearch = () => {
    const { clearValue } = this.props;
    this.setState({ searchValue: '' }, () => {
      clearValue && clearValue();
    });
  };

  setFocus = (isSelectAllText) => {
    if (this.inputRef === document.activeElement) return;
    this.inputRef.focus();
    if (isSelectAllText) {
      const txtLength = this.state.searchValue.length;
      this.inputRef.setSelectionRange(0, txtLength);
    }
  };

  renderClear = () => {
    const { isClearable, clearClassName, components = {} } = this.props;
    const { searchValue } = this.state;
    if (!isClearable || !searchValue) return null;
    const { ClearIndicator } = components;
    if (React.isValidElement(ClearIndicator)) {
      return React.cloneElement(ClearIndicator, { clearValue: this.clearSearch });
    } else if (Utils.isFunction(ClearIndicator)) {
      return <ClearIndicator clearValue={this.clearSearch} />;
    }
    return (
      <i className={classnames('search-text-clear input-icon-addon', clearClassName)} onClick={this.clearSearch}>×</i>
    );
  };

  render() {
    const { placeholder, autoFocus, className, onKeyDown, disabled = false, style } = this.props;
    const { searchValue } = this.state;

    return (
      <Fragment>
        <input
          type="text"
          value={searchValue}
          className={classnames('form-control', className)}
          onChange={this.onChange}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onCompositionStart={this.onCompositionStart}
          onCompositionEnd={this.onCompositionEnd}
          onKeyDown={onKeyDown}
          disabled={disabled}
          style={style}
          ref={ref => this.inputRef = ref}
        />
        {this.renderClear()}
      </Fragment>
    );
  }
}

SearchInput.propTypes = propTypes;

export default SearchInput;
