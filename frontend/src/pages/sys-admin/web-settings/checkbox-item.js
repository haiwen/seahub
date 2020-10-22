import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import SettingItemBase from './setting-item-base';

const propTypes = {
  saveSetting: PropTypes.func.isRequired,
  keyText: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  helpTip: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired
};

class WebSettingCheckbox extends Component {

  constructor(props) {
    super(props);
    this.state = {
      inputChecked: this.props.value
    };
  }

  onInputChange = (e) => {
    const checked = e.target.checked;
    const valueToNum = checked ? 1 : 0;
    this.setState({
      inputChecked: checked
    });
    this.props.saveSetting(this.props.keyText, valueToNum);
  }

  render() {
    const { inputChecked } = this.state;
    const { helpTip, displayName } = this.props;
    return (
      <SettingItemBase
        displayName={displayName}
        mainContent={
          <Fragment>
            <Input className="ml-0" checked={inputChecked} type='checkbox' onChange={this.onInputChange} />
            <p className="ml-4">{helpTip}</p>
          </Fragment>
        }
      />
    );
  }
}

WebSettingCheckbox.propTypes = propTypes;

export default WebSettingCheckbox;
