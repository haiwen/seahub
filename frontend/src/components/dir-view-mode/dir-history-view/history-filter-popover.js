import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover } from 'reactstrap';
import isHotkey from 'is-hotkey';
import HistoryBasicFilters from './filters/basic-filters';
import { getEventClassName } from '../../../utils/dom';

const HistoryFilterPopover = ({ target, filters, onClose, onChange, allCommits }) => {
  const popoverRef = useRef(null);
  const isSelectOpenRef = useRef(false);

  useEffect(() => {
    // Click popover to trigger it to show
    if (popoverRef.current) {
      popoverRef.current.click();
    }

    // Handle click outside to close
    const handleClickOutside = (e) => {
      const className = getEventClassName(e);

      // Don't close if clicking on popover elements (dropdowns, date pickers, etc.)
      if (className.includes('popover')) {
        return;
      }

      // Don't close if clicking on dropdown menus (Date/Creator filters use reactstrap Dropdown)
      // These are rendered outside the popover via Portal
      if (className.includes('dropdown') ||
          className.includes('search-filter-menu') ||
          className.includes('filter-by-date') ||
          className.includes('filter-by-creator-container') ||
          className.includes('filter-by-creator-menu') ||
          className.includes('user-item') ||
          className.includes('user-avatar') ||
          className.includes('user-name') ||
          className.includes('user-remove') ||
          className.includes('date-picker') ||
          className.includes('rc-calendar')) {
        return;
      }

      // Don't close if clicking inside the popover
      if (popoverRef.current && popoverRef.current.contains(e.target)) {
        return;
      }

      // Click is outside - close the popover
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return false;
    };

    // Handle ESC key to close
    const handleKeyDown = (e) => {
      if (isHotkey('esc', e) && !isSelectOpenRef.current) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleChange = useCallback((newFilters) => {
    // Update parent state immediately
    onChange(newFilters);
  }, [onChange]);

  const handlePopoverInsideClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <UncontrolledPopover
      placement="bottom-start"
      isOpen={true}
      target={target}
      fade={false}
      hideArrow={true}
      className="sf-history-filter-popover"
      boundariesElement={document.body}
    >
      <div ref={popoverRef} onClick={handlePopoverInsideClick} className="sf-history-filters">
        <HistoryBasicFilters
          filters={filters}
          onChange={handleChange}
          allCommits={allCommits}
        />
      </div>
    </UncontrolledPopover>
  );
};

HistoryFilterPopover.propTypes = {
  target: PropTypes.string.isRequired,
  filters: PropTypes.shape({
    date: PropTypes.object,
    creators: PropTypes.array,
    tags: PropTypes.array,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  allCommits: PropTypes.array,
};

export default HistoryFilterPopover;

