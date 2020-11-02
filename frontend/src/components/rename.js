import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import toaster from './toast';

const propTypes = {
  hasSuffix: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onRenameConfirm: PropTypes.func.isRequired,
  onRenameCancel: PropTypes.func.isRequired,
};

class Rename extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: props.name
    };
  }

  componentDidMount() {
    this.refs.renameInput.focus();
    if (this.props.hasSuffix) {
      var endIndex = this.props.name.lastIndexOf('.');
      this.refs.renameInput.setSelectionRange(0, endIndex, 'forward');
    } else {
      this.refs.renameInput.setSelectionRange(0, -1);
    }
  }

  onChange = (e) => {
    this.setState({name: e.target.value});
  }

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }

  onKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.onRenameConfirm(e);
    }
  }

  onRenameConfirm = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let newName = this.state.name.trim();
    if (newName === this.props.name) {
      this.props.onRenameCancel();
      return;
    }

    let { isValid, errMessage } = this.validateInput();
    if (!isValid) {
      toaster.danger(errMessage);
    } else {
      this.props.onRenameConfirm(newName);
    }
  }

  onRenameCancel = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onRenameCancel();
  }

  validateInput = () => {
    let newName = this.state.name.trim();
    let isValid = true;
    let errMessage = '';
    if (!newName) {
      isValid = false;
      errMessage = gettext('Name is required.');
      return { isValid, errMessage };
    }

    if (newName.indexOf('/') > -1) {
      isValid = false;
      errMessage = gettext('Name should not include ' + '\'/\'' + '.');
      return { isValid, errMessage };
    }

    return { isValid, errMessage };
  }

  render() {
    return (
      <div className="rename-container">
        <input
          ref="renameInput"
          value={this.state.name}
          onChange={this.onChange}
          onKeyPress={this.onKeyPress}
          onClick={this.onClick}
        />
        <button className="btn btn-secondary sf2-icon-confirm confirm" onClick={this.onRenameConfirm}></button>
        <button className="btn btn-secondary sf2-icon-cancel cancel" onClick={this.onRenameCancel}></button>
      </div>
    );
  }
}

Rename.propTypes = propTypes;

export default Rename;
