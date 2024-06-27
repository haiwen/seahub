import React from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../utils';

class PreHideColumnSetter extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowHideColumnSetter: false,
      shownColumnKeys: props.shownColumnKeys || [],
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { shownColumnKeys } = nextProps;
    if (shownColumnKeys !== this.props.shownColumnKeys) {
      this.setState({
        isShowHideColumnSetter: false,
        shownColumnKeys,
      });
    }
  }

  onHideColumnToggle = () => {
    const { isShowHideColumnSetter } = this.state;
    if (isShowHideColumnSetter) {
      const { shownColumnKeys } = this.state;
      this.props.onSettingUpdate(shownColumnKeys);
    }
    this.setState({ isShowHideColumnSetter: !isShowHideColumnSetter });
  };

  modifyHiddenColumns = (shownColumnKeys) => {
    this.setState({ shownColumnKeys });
  };

  render() {
    const { columns, wrapperClass } = this.props;
    if (!columns) return null;
    const { shownColumnKeys } = this.state;
    const shown_column_keys = shownColumnKeys || [];
    const hiddenColumns = columns.filter((column) => !shown_column_keys.includes(column.key));
    const hiddenColumnsLength = hiddenColumns.length;
    let message = gettext('Preset hide columns');
    if (hiddenColumnsLength === 1) {
      message = gettext('1 preset hidden column');
    } else if (hiddenColumnsLength > 1) {
      message = gettext('xxx preset hidden columns').replace('xxx', hiddenColumnsLength);
    }
    let settingClass = wrapperClass || '';
    settingClass = (settingClass && hiddenColumnsLength > 0) ? settingClass + ' active' : settingClass;
    return (
      <div className={`setting-item ${settingClass ? '' : 'mb-1'}`}>
        <div className="mr-2 filters-setting-btn" onClick={this.onHideColumnToggle} id="sf-metadata-hidden-column-popover">
          <Icon iconName="hide" />
          <span>{message}</span>
        </div>
      </div>
    );
  }
}

PreHideColumnSetter.propTypes = {
  shownColumnKeys: PropTypes.array,
  columns: PropTypes.array,
  onSettingUpdate: PropTypes.func.isRequired,
  wrapperClass: PropTypes.string,
};

export default PreHideColumnSetter;
