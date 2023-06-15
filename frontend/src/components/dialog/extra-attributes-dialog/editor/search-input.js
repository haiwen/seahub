import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

class SearchInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      searchValue: props.value,
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

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({searchValue: nextProps.value});
    }
  }

  componentWillUnmount() {
    this.timer && clearTimeout(this.timer);
    this.timer = null;
    this.inputRef = null;
  }

  onCompositionStart = () => {
    this.isInputtingChinese = true;
  }

  onChange = (e) => {
    this.timer && clearTimeout(this.timer);
    const { onChange, wait } = this.props;
    let text = e.target.value;
    this.setState({searchValue: text || ''}, () => {
      if (this.isInputtingChinese) return;
      this.timer = setTimeout(() => {
        onChange && onChange(this.state.searchValue.trim());
      }, wait);
    });
  }

  onCompositionEnd = (e) => {
    this.isInputtingChinese = false;
    this.onChange(e);
  }

  setFocus = (isSelectAllText) => {
    if (this.inputRef === document.activeElement) return;
    this.inputRef.focus();
    if (isSelectAllText) {
      const txtLength = this.state.searchValue.length;
      this.inputRef.setSelectionRange(0, txtLength);
    }
  }

  render() {
    const { placeholder, autoFocus, className, onKeyDown, disabled, style } = this.props;
    const { searchValue } = this.state;

    return (
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
    );
  }
}

SearchInput.propTypes = {
  placeholder: PropTypes.string,
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func,
  wait: PropTypes.number,
  disabled: PropTypes.bool,
  style: PropTypes.object,
  value: PropTypes.string,
};

SearchInput.defaultProps = {
  wait: 100,
  disabled: false,
  value: '',
};

export default SearchInput;
