import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { getValidSorts, CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../utils';

const propTypes = {
  wrapperClass: PropTypes.string,
  target: PropTypes.string,
  isNeedSubmit: PropTypes.bool,
  sorts: PropTypes.array,
  columns: PropTypes.array,
  onSortsChange: PropTypes.func,
};

class SortSetter extends Component {

  static defaultProps = {
    target: 'sf-metadata-sort-popover',
    isNeedSubmit: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      isSortPopoverShow: false,
    };
  }

  onSortToggle = () => {
    this.setState({ isSortPopoverShow: !this.state.isSortPopoverShow });
  };

  onKeyDown = (e) => {
    e.stopPropagation();
    if (CommonlyUsedHotkey.isEnter(e) || CommonlyUsedHotkey.isSpace(e)) this.onSortToggle();
  };

  update = (update) => {
    const { sorts } = update || {};
    this.props.onSortsChange(sorts);
  };

  render() {
    const { sorts, columns, isNeedSubmit, wrapperClass } = this.props;
    if (!columns) return null;
    const validSorts = getValidSorts(sorts || [], columns);
    const sortsLength = validSorts ? validSorts.length : 0;

    let sortMessage = isNeedSubmit ? gettext('Preset sort') : gettext('Sort');
    if (sortsLength === 1) {
      sortMessage = isNeedSubmit ? gettext('1 preset sort') : gettext('1 sort');
    } else if (sortsLength > 1) {
      sortMessage = isNeedSubmit ? gettext('xxx preset sorts') : gettext('xxx sorts');
      sortMessage = sortMessage.replace('xxx', sortsLength);
    }
    let labelClass = wrapperClass || '';
    labelClass = (labelClass && sortsLength > 0) ? labelClass + ' active' : labelClass;

    return (
      <>
        <div className={`setting-item ${labelClass ? '' : 'mb-1'}`}>
          <div
            className={`mr-2 setting-item-btn filters-setting-btn ${labelClass}`}
            onClick={this.onSortToggle}
            role="button"
            onKeyDown={this.onKeyDown}
            title={sortMessage}
            aria-label={sortMessage}
            tabIndex={0}
            id={this.props.target}
          >
            <Icon iconName="sort" />
            <span>{sortMessage}</span>
          </div>
        </div>
      </>
    );
  }
}

SortSetter.propTypes = propTypes;

export default SortSetter;
