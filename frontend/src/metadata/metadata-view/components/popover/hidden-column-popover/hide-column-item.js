import React from 'react';
import PropTypes from 'prop-types';
import { Icon, Switch } from '@seafile/sf-metadata-ui-component';

class HideColumnItem extends React.PureComponent {

  static defaultProps = {
    readonly: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      setting: null
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (JSON.stringify(nextProps.setting) !== JSON.stringify(prevState.setting)) {
      return { setting: nextProps.setting };
    }
    return null;
  }

  onUpdateFieldSetting = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    const value = event.target.checked;
    const { setting } = this.state;
    if (setting.isChecked === value) {
      return;
    }
    const newSetting = Object.assign({}, setting, { isChecked: value });
    this.setState({ setting: newSetting }, () => {
      this.props.onUpdateFieldSetting(newSetting);
    });
  };

  render() {
    const { setting } = this.state;
    const { readonly } = this.props;
    const placeholder = (
      <>
        <Icon iconName={setting.columnIcon} />
        <span className="text-truncate">{setting.columnName}</span>
      </>
    );
    return (
      <Switch
        checked={setting.isChecked}
        disabled={readonly}
        placeholder={placeholder}
        onChange={this.onUpdateFieldSetting}
        switchClassName="dropdown-item"
      />
    );
  }
}

HideColumnItem.propTypes = {
  readonly: PropTypes.bool,
  setting: PropTypes.object.isRequired,
  onUpdateFieldSetting: PropTypes.func.isRequired,
};

export default HideColumnItem;
