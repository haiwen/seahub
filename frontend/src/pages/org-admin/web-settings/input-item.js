import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Input, Button, InputGroup } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SettingItemBase from './setting-item-base';

const propTypes = {
  inputType: PropTypes.string,
  saveSetting: PropTypes.func.isRequired,
  keyText: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  helpTip: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  inputAddon: PropTypes.node,
};

class WebSettingInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isBtnsShown: false,
      value: this.props.value
    };
  }

  toggleBtns = () => {
    this.setState({ isBtnsShown: !this.state.isBtnsShown });
  };

  hideBtns = (e) => {
    if (!this.state.isBtnsShown) {
      return;
    }
    if (this.props.value != this.state.value) {
      this.setState({ value: this.props.value });
    }
    this.toggleBtns();
  };

  onInputChange = (e) => {
    this.setState({ value: e.target.value });
  };

  onSubmit = (e) => {
    const value = this.state.value.trim();
    if (value != this.props.value) {
      this.props.saveSetting(this.props.keyText, value);
    }
    this.toggleBtns();
  };

  render() {
    const { isBtnsShown, value } = this.state;
    const { helpTip, displayName, inputType, disabled, inputAddon } = this.props;
    return (
      <SettingItemBase
        displayName={displayName}
        helpTip={helpTip}
        mainContent={
          disabled ?
            <Input type={inputType || 'text'} className={inputType == 'textarea' ? 'web-setting-textarea' : ''} value={value} disabled /> :
            <InputGroup>
              <Input type={inputType || 'text'} className={inputType == 'textarea' ? 'web-setting-textarea' : ''} onChange={this.onInputChange} onFocus={this.toggleBtns} onBlur={this.hideBtns} value={value} />
              {inputAddon && inputAddon}
            </InputGroup>
        }
        extraContent={
          isBtnsShown ?
            <Fragment>
              <Button color="primary" className="sf2-icon-tick web-setting-icon-btn web-setting-icon-btn-submit" onMouseDown={this.onSubmit} title={gettext('Submit')}></Button>
              <Button className="ml-1 sf2-icon-x2 web-setting-icon-btn web-setting-icon-btn-cancel" title={gettext('Cancel')}></Button>
            </Fragment> : null
        }
      />
    );
  }
}

WebSettingInput.propTypes = propTypes;

export default WebSettingInput;
