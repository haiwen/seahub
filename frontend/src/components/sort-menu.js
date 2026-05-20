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

class SortMenu extends React.Component {
  constructor(props) {
    super(props);
    this.sortOptions = this.props.sortOptions || DEFAULT_SORT_OPTIONS;
  }

  buildSortMenuItems = ({ sortOptions, sortBy, sortOrder }) => {
    return sortOptions.map((item) => ({
      key: item.value,
      label: item.text,
      checked: item.value === `${sortBy}-${sortOrder}`,
      sortOption: item,
      onClick: () => this.props.onSelectSortOption(item)
    }));
  };

  render() {
    const { sortBy, sortOrder, className } = this.props;
    const sortOptions = this.buildSortMenuItems({ sortOptions: this.sortOptions, sortBy, sortOrder });

    return (
      <CustomDropdown
        target="sort-icon"
        items={sortOptions}
        variant="action"
        className={className || ''}
        trigger={(
          <>
            <Icon symbol="sort" />
            <Tooltip target="sort-icon">{gettext('Switch sort mode')}</Tooltip>
          </>
        )}
        triggerClassName="cur-view-path-btn px-1"
        toggleProps={{ 'aria-label': gettext('Switch sort mode') }}
        menuPortal={false}
      />
    );
  }

}

SortMenu.propTypes = propTypes;

export default SortMenu;
