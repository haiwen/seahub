import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { KeyCodes } from '../../../../constants';
import { CellValueType } from './constants';
import { getTrimmedString } from '../../../utils/common';
import { isCellValueChanged } from '../../../utils/cell';

class SimpleTextEditor extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value: props.value || '',
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { value: oldValue, column } = this.props;
    const { value: newValue } = nextProps;
    if (isCellValueChanged(oldValue, newValue, column.type)) {
      this.setState({ value: newValue || '' });
    }
  }

  getValue = () => {
    const { column } = this.props;
    const { value } = this.state;
    const text = getTrimmedString(value) || null;
    return { [column.key]: text };
  };

  updateValue = (value, callback) => {
    if (value === this.state.value) return;
    this.setState({ value }, () => {
      callback && callback();
    });
  };

  focusInput = () => {
    this.input && this.input.focus();
  };

  blurInput = () => {
    this.input && this.input.blur();
  };

  onBlur = () => {
    this.props.onCommit();
  };

  onPaste = (e) => {
    e.stopPropagation();
  };

  onCut = (e) => {
    e.stopPropagation();
  };

  onChange = (event) => {
    event.persist();
    const value = event.target.value;
    this.setState({ value }, () => {
      if (this.props.onChange) {
        this.props.onChange(event);
      }
    });
  };

  onInputKeyDown = (e) => {
    const { selectionStart, selectionEnd, value } = e.currentTarget;
    if (e.keyCode === KeyCodes.Enter) {
      e.preventDefault();
      this.onBlur();
    } else if (
      (e.keyCode === KeyCodes.ChineseInputMethod) ||
      (e.keyCode === KeyCodes.LeftArrow && selectionStart === 0) ||
      (e.keyCode === KeyCodes.RightArrow && selectionEnd === value.length)
    ) {
      e.stopPropagation();
    }
    if (this.props.onKeyDown) {
      this.props.onKeyDown(e);
    }
  };

  onClick = (event) => {
    if (this.props.onInputClick) {
      this.props.onInputClick(event);
    }
  };

  onCompositionStart = (event) => {
    if (this.props.onCompositionStart) {
      this.props.onCompositionStart(event);
    }
  };

  onCompositionEnd = (event) => {
    if (this.props.onCompositionEnd) {
      this.props.onCompositionEnd(event);
    }
    this.onChange(event);
  };

  getInputNode = () => {
    if (!this.input) return null;
    if (this.input.tagName === 'INPUT') {
      return this.input;
    }
    return this.input.querySelector('input:not([type=hidden])');
  };

  setInputRef = (input) => {
    this.input = input;
  };

  render() {
    const { column, readOnly, className, placeholder } = this.props;
    const { value } = this.state;
    return (
      <>
        <input
          type="text"
          className={classnames('sf-metadata-text-editor form-control', className)}
          ref={this.setInputRef}
          placeholder={placeholder || ''}
          disabled={readOnly}
          onBlur={this.onBlur}
          onCut={this.onCut}
          onPaste={this.onPaste}
          value={value}
          name={column.name}
          title={column.name}
          aria-label={column.name}
          onChange={this.onChange}
          onKeyDown={this.onInputKeyDown}
          onClick={this.onClick}
          onCompositionStart={this.onCompositionStart}
          onCompositionEnd={this.onCompositionEnd}
        />
      </>
    );
  }
}

SimpleTextEditor.propTypes = {
  readOnly: PropTypes.bool,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  column: PropTypes.object,
  value: PropTypes.oneOfType(CellValueType),
  onKeyDown: PropTypes.func,
  onChange: PropTypes.func,
  onInputClick: PropTypes.func,
  onCompositionStart: PropTypes.func,
  onCompositionEnd: PropTypes.func,
  onCommit: PropTypes.func,
};

export default SimpleTextEditor;
