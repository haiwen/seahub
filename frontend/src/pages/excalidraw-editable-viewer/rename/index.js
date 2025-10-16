import React from 'react';
import { toaster } from '@seafile/sdoc-editor';
import PropTypes from 'prop-types';
import './index.css';

const propTypes = {
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
    this.inputRef.current.setSelectionRange(0, -1);
  }

  onChange = (e) => {
    this.setState({ name: e.target.value });
  };

  onKeyDown = (e) => {
    if (e.keyCode === 13) {
      this.onRenameConfirm(e);
    } else if (e.keyCode === 27) {
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
    const { t } = this.props;
    let isValid = true;
    let errMessage = '';
    if (!newName) {
      isValid = false;
      errMessage = t('Name_is_required');
      return { isValid, errMessage };
    }

    return { isValid, errMessage };
  };

  render() {
    return (
      <div className="excalidraw-rename-container">
        <input
          ref={this.inputRef}
          value={this.state.name}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          onBlur={this.onRenameConfirm}
        />
      </div>
    );
  }
}

Rename.propTypes = propTypes;

export default Rename;
