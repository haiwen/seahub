import React from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { getValidFilters, CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../../../utils/constants';

const propTypes = {
  wrapperClass: PropTypes.string,
  filtersClassName: PropTypes.string,
  target: PropTypes.string,
  isNeedSubmit: PropTypes.bool,
  filterConjunction: PropTypes.string,
  filters: PropTypes.array,
  columns: PropTypes.array,
  onFiltersChange: PropTypes.func,
  collaborators: PropTypes.array,
  isPre: PropTypes.bool,
};

class FilterSetter extends React.Component {

  static defaultProps = {
    target: 'sf-metadata-filter-popover',
    isNeedSubmit: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowFilterSetter: false,
    };
  }

  onKeyDown = (e) => {
    e.stopPropagation();
    if (CommonlyUsedHotkey.isEnter(e) || CommonlyUsedHotkey.isSpace(e)) this.onFilterSetterToggle();
  };

  onFilterSetterToggle = () => {
    this.setState({ isShowFilterSetter: !this.state.isShowFilterSetter });
  };

  update = (update) => {
    const { filters, filter_conjunction } = update || {};
    const { columns } = this.props;
    const valid_filters = getValidFilters(filters, columns);

    this.props.onFiltersChange(valid_filters, filter_conjunction);
  };

  render() {
    const {
      wrapperClass, filters, columns, isNeedSubmit,
      // collaborators, filtersClassName, filterConjunction,
    } = this.props;
    if (!columns) return null;
    // const { isShowFilterSetter } = this.state;
    const validFilters = deepCopy(getValidFilters(filters || [], columns));
    const filtersLength = validFilters ? validFilters.length : 0;
    let filterMessage = isNeedSubmit ? gettext('Preset_filter') : gettext('Filter');
    if (filtersLength === 1) {
      filterMessage = isNeedSubmit ? gettext('1_preset_filter') : gettext('1_filter');
    } else if (filtersLength > 1) {
      filterMessage = isNeedSubmit ? gettext('Preset_filters') : gettext('Filters');
      filterMessage = filtersLength + ' ' + filterMessage;
    }
    let labelClass = wrapperClass || '';
    labelClass = (labelClass && filtersLength > 0) ? labelClass + ' active' : labelClass;
    return (
      <>
        <div className={`setting-item ${labelClass ? 'mr-2' : 'mb-1'}`}>
          <div
            className={`setting-item-btn filters-setting-btn ${labelClass}`}
            onClick={this.onFilterSetterToggle}
            role="button"
            onKeyDown={this.onKeyDown}
            title={filterMessage}
            aria-label={filterMessage}
            tabIndex={0}
            id={this.props.target}
          >
            <Icon iconName='filter' />
            <span>{filterMessage}</span>
          </div>
        </div>
      </>
    );
  }
}

FilterSetter.propTypes = propTypes;

export default FilterSetter;
