import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import Icon from './icon';
import Tooltip from './tooltip';
import CustomDropdown from './dropdown';

const propTypes = {
  className: PropTypes.string,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortOptions: PropTypes.array,
  onSelectSortOption: PropTypes.func.isRequired
};

const DEFAULT_SORT_OPTIONS = [
  { value: 'name-asc', text: gettext('Ascending by name') },
  { value: 'name-desc', text: gettext('Descending by name') },
  { value: 'size-asc', text: gettext('Ascending by size') },
  { value: 'size-desc', text: gettext('Descending by size') },
  { value: 'time-asc', text: gettext('Ascending by time') },
  { value: 'time-desc', text: gettext('Descending by time') }
];

const buildSortMenuItems = ({ sortOptions, sortBy, sortOrder }) => {
  return sortOptions.map((item) => ({
    key: item.value,
    label: item.text,
    checked: item.value === `${sortBy}-${sortOrder}`,
    sortOption: item,
  }));
};

class SortMenu extends React.Component {
  constructor(props) {
    super(props);
    this.sortOptions = this.props.sortOptions || DEFAULT_SORT_OPTIONS;
  }

  render() {
    const { sortBy, sortOrder, className } = this.props;
    const sortOptions = buildSortMenuItems({ sortOptions: this.sortOptions, sortBy, sortOrder });

    return (
      <CustomDropdown
        target="sort-icon"
        items={sortOptions}
        variant="control"
        className={className || ''}
        trigger={(
          <>
            <Icon symbol="sort" />
            <Tooltip target="sort-icon">{gettext('Switch sort mode')}</Tooltip>
          </>
        )}
        triggerClassName="cur-view-path-btn px-1"
        toggleProps={{ tag: 'span', 'aria-label': gettext('Switch sort mode') }}
        menuPortal={false}
        onItemClick={(selectedItem) => this.props.onSelectSortOption(selectedItem.sortOption)}
      />
    );
  }

}

SortMenu.propTypes = propTypes;

export default SortMenu;
