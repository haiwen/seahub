import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../utils';

class HideColumnSetter extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHideColumnSetterShow: false,
    };
  }

  onKeyDown = (e) => {
    if (CommonlyUsedHotkey.isEnter(e) || CommonlyUsedHotkey.isSpace(e)) this.onHideColumnToggle();
  };

  onHideColumnToggle = () => {
    this.setState({ isHideColumnSetterShow: !this.state.isHideColumnSetterShow });
  };

  render() {
    const { columns, wrapperClass, target, localShownColumnKeys } = this.props;
    if (!columns) return null;
    let message = gettext('Hide_columns');
    const hiddenColumns = columns.filter((column) => !localShownColumnKeys.includes(column.key));
    const hiddenColumnsLength = hiddenColumns.length;
    if (hiddenColumnsLength === 1) {
      message = gettext('1_hidden_column');
    } else if (hiddenColumnsLength > 1) {
      message = gettext('xxx_hidden_columns', { count: hiddenColumnsLength });
    }
    let labelClass = wrapperClass || '';
    labelClass = (labelClass && hiddenColumnsLength > 0) ? labelClass + ' active' : labelClass;

    return (
      <>
        <div className={`setting-item ${labelClass ? '' : 'mb-1'}`}>
          <div
            className={`mr-2 setting-item-btn filters-setting-btn ${labelClass}`}
            onClick={this.onHideColumnToggle}
            role="button"
            onKeyDown={this.onKeyDown}
            title={message}
            aria-label={message}
            tabIndex={0}
            id={target}
          >
            <Icon iconName="hide" />
            <span>{message}</span>
          </div>
        </div>
      </>
    );
  }
}

HideColumnSetter.propTypes = {
  wrapperClass: PropTypes.string,
  target: PropTypes.string,
  page: PropTypes.object,
  shownColumnKeys: PropTypes.array,
  localShownColumnKeys: PropTypes.array,
  columns: PropTypes.array,
  modifyHiddenColumns: PropTypes.func,
};

export default HideColumnSetter;
