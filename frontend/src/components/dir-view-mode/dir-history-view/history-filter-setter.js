import React, { useCallback, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import IconBtn from '../../icon-btn';
import HistoryFilterPopover from './history-filter-popover';
import { gettext } from '../../../utils/constants';
import { isEnter, isSpace } from '../../../utils/hotkey';
import { HISTORY_MODE } from '../constants';

const DEFAULT_FILTER = {
  date: { value: '', from: null, to: null },
  creators: [],
  tags: [],
  suffixes: '',
};
const HistoryFilterSetter = ({ mode = HISTORY_MODE, filters = DEFAULT_FILTER, onFiltersChange }) => {

  const [isShowPopover, setShowPopover] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

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
    if (localFilters.suffixes) count++;
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
    onFiltersChange(localFilters);
    setShowPopover(false);
  }, [onFiltersChange, localFilters]);

  const handleChange = useCallback((newFilters) => {
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
          mode={mode}
          target="history-filter-popover-target"
          filters={localFilters}
          onClose={handleClose}
          onChange={handleChange}
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
    suffixes: PropTypes.string,
  }),
  onFiltersChange: PropTypes.func.isRequired,
};

export default HistoryFilterSetter;

