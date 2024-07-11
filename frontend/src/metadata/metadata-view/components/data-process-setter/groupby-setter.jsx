import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../utils';

class GroupbySetter extends Component {

  static defaultProps = {
    target: 'sf-metadata-groupby-popover',
    isNeedSubmit: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowGroupbySetter: false,
    };
  }

  onKeyDown = (e) => {
    if (CommonlyUsedHotkey.isEnter(e) || CommonlyUsedHotkey.isSpace(e)) this.onGroupbySetterToggle();
  };

  onGroupbySetterToggle = () => {
    this.setState({ isShowGroupbySetter: !this.state.isShowGroupbySetter });
  };

  render() {
    const { columns, groupbys, wrapperClass } = this.props;
    if (!columns) return null;

    const groupbysLength = groupbys ? groupbys.length : 0;
    const activated = groupbysLength > 0;

    // need to translate to Group
    let groupbyMessage = gettext('Group_by');
    if (groupbysLength === 1) {
      groupbyMessage = gettext('Grouped by 1 column');
    } else if (groupbysLength > 1) {
      groupbyMessage = gettext('Grouped by xxx columns').replace('xxx', groupbysLength);
    }
    let labelClass = wrapperClass || '';
    labelClass = (labelClass && activated) ? labelClass + ' active' : labelClass;

    return (
      <>
        <div className={classnames('setting-item', { 'mb-1': !labelClass })}>
          <div
            className={classnames('setting-item-btn groupbys-setting-btn', labelClass)}
            onClick={this.onGroupbySetterToggle}
            role="button"
            onKeyDown={this.onKeyDown}
            title={groupbyMessage}
            aria-label={groupbyMessage}
            tabIndex={0}
            id={this.props.target}
          >
            <Icon iconName="group" />
          </div>
        </div>
      </>
    );
  }
}

GroupbySetter.propTypes = {
  wrapperClass: PropTypes.string,
  columns: PropTypes.array,
  groupbys: PropTypes.array, // valid groupbys
  modifyGroupbys: PropTypes.func,
  target: PropTypes.string,
  isNeedSubmit: PropTypes.bool,
};

export default GroupbySetter;
