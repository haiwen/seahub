import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import { Utils } from '../utils/utils';
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
    this.inputRef = React.createRef();
  }

  componentDidMount() {
    this.inputRef.current.focus();
    if (this.props.hasSuffix) {
      var endIndex = this.props.name.lastIndexOf('.');
      this.inputRef.current.setSelectionRange(0, endIndex, 'forward');
    } else {
      this.inputRef.current.setSelectionRange(0, -1);
    }
    // ensure real dom has been rendered, then listen the click event
    setTimeout(() => {
      document.addEventListener('click', this.onClick);
    }, 1);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onClick);
  }

  onClick = (e) => {
    if (!this.inputRef.current.contains(e.target)) {
      this.onRenameConfirm();
    }
  };

  onChange = (e) => {
    this.setState({name: e.target.value});
  };

  onKeyDown = (e) => {
    if (e.keyCode === Utils.keyCodes.enter) {
      this.onRenameConfirm(e);
    } else if (e.keyCode === Utils.keyCodes.esc) {
      this.onRenameCancel(e);
    }
    e.nativeEvent.stopImmediatePropagation();
  };

  onRenameConfirm = (e) => {
    e && e.nativeEvent.stopImmediatePropagation();
    let newName = this.state.name.trim();
    if (newName === this.props.name) {
      this.props.onRenameCancel();
      return;
    }

    let { isValid, errMessage } = this.validateInput();
    if (!isValid) {
      toaster.danger(errMessage);
      this.props.onRenameCancel();
    } else {
      this.props.onRenameConfirm(newName);
    }
  };

  onRenameCancel = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onRenameCancel();
  };

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
  };

  render() {
    return (
      <div className="rename-container">
        <input
          ref={this.inputRef}
          value={this.state.name}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
        />
      </div>
    );
  }
}

Rename.propTypes = propTypes;

export default Rename;
