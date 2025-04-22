import React, { useCallback, useRef, useState } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../../utils/constants';
import ModalPortal from '../../modal-portal';
import { SEARCH_FILTERS_KEY } from '../../../constants';

const FilterBySuffix = ({ suffixes, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(suffixes.join(', '));
  const inputRef = useRef(null);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const handleInput = useCallback((e) => {
    setInputValue(e.target.value);
    const suffixes = e.target.value.split(',').map(suffix => suffix.trim()).filter(Boolean);
    onSelect(SEARCH_FILTERS_KEY.SUFFIXES, suffixes);
  }, [onSelect]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      setIsOpen(false);
    }
  }, []);

  return (
    <div className="search-filter filter-by-suffix-container">
      <Dropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle tag="div" className={classNames('search-filter-toggle', {
          'active': isOpen && suffixes.length > 0,
          'highlighted': suffixes.length > 0,
        })} onClick={toggle}>
          <div className="filter-label" title={gettext('File suffix')}>{gettext('File suffix')}</div>
          <i className="sf3-font sf3-font-down pl-1" />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu filter-by-suffix-menu p-4">
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder={gettext('Seperate multiple suffixes by ","(like .sdoc, .pdf)')}
              value={inputValue}
              autoFocus
              onChange={handleInput}
              onKeyDown={handleKeyDown}
            />
            {inputValue.length > 0 && (
              <button
                type="button"
                className="clear-icon-right sf3-font sf3-font-x-01"
                onClick={() => setInputValue('')}
                aria-label={gettext('Clear')}
              >
              </button>
            )}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    </div>
  );
};

FilterBySuffix.propTypes = {
  suffixes: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default FilterBySuffix;
