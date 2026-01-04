import React, { useCallback, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import IconBtn from '../../icon-btn';
import HistoryFilterPopover from './history-filter-popover';
import { gettext } from '../../../utils/constants';
import { isEnter, isSpace } from '../../../utils/hotkey';

/**
 * History Filter Setter Component
 * Simplified version inspired by metadata FilterSetter
 * Supports filtering by time range, modifier, and tags
 */
const HistoryFilterSetter = ({ filters = {
  date: { value: '', from: null, to: null },
  creators: [],
  tags: [],
}, onFiltersChange, allCommits = [] }) => {
  const [isShowPopover, setShowPopover] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync localFilters with props when popup is closed (initial state)
  useEffect(() => {
    if (!isShowPopover) {
      setLocalFilters(filters);
    }
  }, [filters, isShowPopover]);

  const filtersCount = useMemo(() => {
    let count = 0;
    if (localFilters.date && localFilters.date.value) count++;
    if (localFilters.creators && localFilters.creators.length > 0) count++;
    if (localFilters.tags && localFilters.tags.length > 0) count++;
    return count;
  }, [localFilters]);

  const message = useMemo(() => {
    if (filtersCount === 1) return gettext('1 filter');
    if (filtersCount > 1) return filtersCount + ' ' + gettext('Filters');
    return gettext('Filter');
  }, [filtersCount]);

  const onToggle = useCallback(() => {
    setShowPopover(!isShowPopover);
  }, [isShowPopover]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (isEnter(event) || isSpace(event)) onToggle();
  }, [onToggle]);

  const handleClose = useCallback(() => {
    // Apply pending filters to parent and close popup
    onFiltersChange(localFilters);
    setShowPopover(false);
  }, [onFiltersChange, localFilters]);

  const handleChange = useCallback((newFilters) => {
    // Only update local state - don't apply to parent yet
    setLocalFilters(newFilters);
  }, []);

  const className = classnames(
    'sf-history-view-tool-operation-btn',
    'sf-history-view-tool-filter',
    { 'active': filtersCount > 0 }
  );

  return (
    <div className="history-filter-setter-wrapper">
      <IconBtn
        symbol="filter"
        size={24}
        className={className}
        onClick={onToggle}
        role="button"
        onKeyDown={onKeyDown}
        title={message}
        aria-label={message}
        tabIndex={0}
        id="history-filter-popover-target"
      />
      {isShowPopover && (
        <HistoryFilterPopover
          target="history-filter-popover-target"
          filters={localFilters}
          onClose={handleClose}
          onChange={handleChange}
          allCommits={allCommits}
        />
      )}
    </div>
  );
};

HistoryFilterSetter.propTypes = {
  filters: PropTypes.shape({
    date: PropTypes.object,
    creators: PropTypes.array,
    tags: PropTypes.array,
  }),
  onFiltersChange: PropTypes.func.isRequired,
  allCommits: PropTypes.array,
};

// defaultProps removed - using JavaScript default parameters instead

export default HistoryFilterSetter;

