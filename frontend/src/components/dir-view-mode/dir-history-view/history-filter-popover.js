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
    if (popoverRef.current) {
      popoverRef.current.click();
    }

    const handleClickOutside = (e) => {
      if (!getEventClassName(e).includes('popover') && !popoverRef.current.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return false;
      }
    };

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

