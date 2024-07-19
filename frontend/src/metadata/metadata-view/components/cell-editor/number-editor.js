import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {
  getNumberDisplayString, DEFAULT_NUMBER_FORMAT, formatStringToNumber, replaceNumberNotAllowInput, isMac
} from '../../_basic';
import { KeyCodes } from '../../../../constants';

class NumberEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: props.value || props.value === 0 ? props.value : '',
    };
  }

  componentDidMount() {
    if (this.props.mode === 'row_expand') {
      this.input.focus();
    }
    const { data = {} } = this.props.column;
    let { value } = this.state;
    value = getNumberDisplayString(value, data) || '';
    this.setState({ value });
  }

  onChange = (event) => {
    const { data } = this.props.column; // data maybe 'null'
    const format = (data && data.format) ? data.format : DEFAULT_NUMBER_FORMAT;
    let currency_symbol = null;
    if (data && data.format === 'custom_currency') {
      currency_symbol = data['currency_symbol'];
    }
    const initValue = event.target.value.trim();

    // Prevent the repetition of periods bug in the Chinese input method of the Windows system
    if (!isMac() && initValue.indexOf('.。') > -1) return;
    const value = replaceNumberNotAllowInput(initValue, format, currency_symbol);
    if (value === this.state.value) return;
    this.setState({ value }, () => {
      if (this.props.onChange) {
        this.props.onChange(event);
      }
    });
  };

  onKeyDown = (event) => {
    let { selectionStart, selectionEnd, value } = event.currentTarget;
    if (event.keyCode === KeyCodes.Enter || event.keyCode === KeyCodes.Esc) {
      event.preventDefault();
      this.onBlur();
      if (this.props.selectDownCell) this.props.selectDownCell();
    } else if ((event.keyCode === KeyCodes.LeftArrow && selectionStart === 0) ||
      (event.keyCode === KeyCodes.RightArrow && selectionEnd === value.length)
    ) {
      event.stopPropagation();
    }
  };

  getValue = () => {
    const { value } = this.state;
    const { column } = this.props;
    return { [column.key]: formatStringToNumber(value, column.data) };
  };

  getInputNode = () => {
    const domNode = ReactDOM.findDOMNode(this.input);
    if (domNode.tagName === 'INPUT') {
      return domNode;
    }

    return domNode.querySelector('input:not([type=hidden])');
  };

  onBlur = () => {
    this.props.onCommit();
  };

  setInputRef = (input) => {
    this.input = input;
    return this.input;
  };

  onPaste = (e) => {
    e.stopPropagation();
  };

  onCut = (e) => {
    e.stopPropagation();
  };

  render() {
    return (
      <input
        ref={this.setInputRef}
        type="text"
        className="form-control"
        value={this.state.value}
        onBlur={this.onBlur}
        onPaste={this.onPaste}
        onCut={this.onCut}
        onKeyDown={this.onKeyDown}
        onChange={this.onChange}
        style={{ textAlign: 'right' }}
        disabled={this.props.readOnly}
      />
    );
  }
}

NumberEditor.propTypes = {
  onBlur: PropTypes.func,
  column: PropTypes.object,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  mode: PropTypes.string,
  onCommit: PropTypes.func,
  readOnly: PropTypes.bool,
  selectDownCell: PropTypes.func,
};

export default NumberEditor;
