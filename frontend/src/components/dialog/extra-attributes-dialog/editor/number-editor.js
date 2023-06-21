import React from 'react';
import PropTypes from 'prop-types';
import { getNumberDisplayString, replaceNumberNotAllowInput, formatStringToNumber, isMac } from '../../../../utils/extra-attributes';
import { KeyCodes, DEFAULT_NUMBER_FORMAT } from '../../../../constants';

class NumberEditor extends React.Component {

  constructor(props) {
    super(props);
    const { row, column } = props;
    const value = row[column.key];
    this.state = {
      value: getNumberDisplayString(value, column.data),
    };
  }

  onChange = (event) => {
    const { data } = this.props.column; // data maybe 'null'
    const format = (data && data.format) ? data.format : DEFAULT_NUMBER_FORMAT;
    let currency_symbol = null;
    if (data && data.format === 'custom_currency') {
      currency_symbol = data['currency_symbol'];
    }
    const initValue = event.target.value.trim();

    //Prevent the repetition of periods bug in the Chinese input method of the Windows system
    if (!isMac() && initValue.indexOf('.。') > -1) return;
    let value = replaceNumberNotAllowInput(initValue, format, currency_symbol);
    if (value === this.state.value) return;
    this.setState({ value });
  }

  onKeyDown = (event) => {
    let { selectionStart, selectionEnd, value } = event.currentTarget;
    if (event.keyCode === KeyCodes.Enter || event.keyCode === KeyCodes.Esc) {
      event.preventDefault();
      this.onBlur();
    } else if ((event.keyCode === KeyCodes.LeftArrow && selectionStart === 0) ||
      (event.keyCode === KeyCodes.RightArrow && selectionEnd === value.length)
    ) {
      event.stopPropagation();
    }
  }

  onBlur = () => {
    const { value } = this.state;
    const { column } = this.props;
    this.props.onCommit({ [column.key]: formatStringToNumber(value, column.data) }, column);
  }

  setInputRef = (input) => {
    this.input = input;
    return this.input;
  };

  onPaste = (e) => {
    e.stopPropagation();
  }

  onCut = (e) => {
    e.stopPropagation();
  }

  render() {
    const { column } = this.props;

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
        disabled={!column.editable}
      />
    );
  }
}

NumberEditor.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
  onCommit: PropTypes.func,
};

export default NumberEditor;
