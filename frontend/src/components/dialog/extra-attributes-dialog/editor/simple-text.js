import React from 'react';
import PropTypes from 'prop-types';
import { KeyCodes } from '../../../../constants';

class SimpleText extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: props.row[props.column.key] || '',
    };
    this.inputRef = React.createRef();
  }

  blurInput = () => {
    setTimeout(() => {
      this.inputRef.current && this.inputRef.current.blur();
    }, 1);
  }

  onBlur = () => {
    let { column, onCommit } = this.props;
    const updated = {};
    updated[column.key] = this.state.value.trim();
    onCommit(updated, column);
  }

  onChange = (e) => {
    let value = e.target.value;
    if (value === this.state.value) return;
    this.setState({value});
  }

  onCut = (e) => {
    e.stopPropagation();
  }

  onPaste = (e) => {
    e.stopPropagation();
  }

  onKeyDown = (e) => {
    if (e.keyCode === KeyCodes.Esc) {
      e.stopPropagation();
      this.blurInput();
      return;
    }
    let { selectionStart, selectionEnd, value } = e.currentTarget;
    if (
      (e.keyCode === KeyCodes.ChineseInputMethod) ||
      (e.keyCode === KeyCodes.LeftArrow && selectionStart === 0) ||
      (e.keyCode === KeyCodes.RightArrow && selectionEnd === value.length)
    ) {
      e.stopPropagation();
    }
  }

  render() {
    const { column } = this.props;
    const { value } = this.state;

    return (
      <input
        type="text"
        onBlur={this.onBlur}
        onCut={this.onCut}
        onPaste={this.onPaste}
        onChange={this.onChange}
        className="form-control"
        value={value}
        onKeyDown={this.onKeyDown}
        disabled={!column.editable}
        ref={this.inputRef}
      />
    );
  }
}

SimpleText.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
  onCommit: PropTypes.func.isRequired,
};

export default SimpleText;
