import React, { Component, Fragment } from 'react';
import { Input, Button, InputGroup } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Icon from '../icon';
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

class InputItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isBtnsShown: false,
      value: props.value,
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.value !== this.props.value && this.props.value !== this.state.value) {
      this.setState({ value: this.props.value });
    }
  }

  toggleBtns = () => {
    this.setState({ isBtnsShown: !this.state.isBtnsShown });
  };

  hideBtns = () => {
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
    e.preventDefault();
    const value = String(this.state.value == null ? '' : this.state.value).trim();
    const currentValue = String(this.props.value == null ? '' : this.props.value).trim();
    if (value != currentValue) {
      this.props.saveSetting(this.props.keyText, value);
    }
    this.toggleBtns();
  };

  render() {
    const { isBtnsShown, value } = this.state;
    const { helpTip, displayName, inputType, disabled, inputAddon } = this.props;
    const input = (
      <Input
        type={inputType || 'text'}
        className={inputType == 'textarea' ? 'web-setting-textarea' : ''}
        onChange={this.onInputChange}
        onFocus={this.toggleBtns}
        onBlur={this.hideBtns}
        value={value}
      />
    );

    return (
      <SettingItemBase
        displayName={displayName}
        helpTip={helpTip}
        mainContent={
          disabled ?
            <Input type={inputType || 'text'} className={inputType == 'textarea' ? 'web-setting-textarea' : ''} value={value} disabled /> :
            inputAddon ?
              <InputGroup>
                {input}
                {inputAddon}
              </InputGroup> : input
        }
        extraContent={
          isBtnsShown ?
            <Fragment>
              <Button color="primary" className="web-setting-icon-btn web-setting-icon-btn-submit" onMouseDown={this.onSubmit} title={gettext('Submit')}>
                <Icon symbol="check" />
              </Button>
              <Button className="ml-1 web-setting-icon-btn web-setting-icon-btn-cancel" title={gettext('Cancel')}>
                <Icon symbol="close" />
              </Button>
            </Fragment> : null
        }
      />
    );
  }
}

InputItem.propTypes = propTypes;

export default InputItem;
