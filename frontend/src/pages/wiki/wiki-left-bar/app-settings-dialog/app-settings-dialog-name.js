import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Label } from 'reactstrap';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';

class AppSettingsDialogName extends Component {

  constructor(props) {
    super(props);
    this.state = {
      name: props.config.wiki_name || '',
    };
  }

  onChange = (event) => {
    this.setState({ name: event.target.value });
  };

  validateName = (name) => {
    name = name.trim();
    if (name === '') {
      return { isValid: false, message: gettext('Name is required') };
    }
    if (name.includes('/')) {
      return { isValid: false, message: gettext('Name cannot contain slash') };
    }
    if (name.includes('\\')) {
      return { isValid: false, message: gettext('Name cannot contain backslash') };
    }
    return { isValid: true, message: name };
  };

  onCommit = () => {
    const { name } = this.state;
    const { isValid, message } = this.validateName(name);
    if (!isValid) {
      toaster.danger(message);
      return;
    } else {
      this.props.updateConfig({ wiki_name: message });
    }
  };

  render() {
    const { name } = this.state;
    return (
      <div className="app-setting-dialog-name">
        <Label>{gettext('Wiki name')}</Label>
        <div className="d-flex">
          <input
            className="form-control rename-area-input"
            type="text"
            value={name}
            onChange={this.onChange}
          />
          <Button className="rename-area-submit" color="primary ml-4" onClick={this.onCommit}>
            {gettext('Submit')}
          </Button>
        </div>
      </div>
    );
  }
}

AppSettingsDialogName.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
};

export default AppSettingsDialogName;
