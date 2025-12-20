import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../../utils/constants';
import ModalPortal from '../../modal-portal';
import { SEARCH_FILTERS_KEY } from '../../../constants';
import Icon from '../../icon';
import { Utils } from '../../../utils/utils';

const FilterBySuffix = ({ suffixes, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(suffixes);
  const inputRef = useRef(null);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const handleInput = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      setIsOpen(false);
    }
  }, []);

  const handleClearInput = useCallback(() => {
    setInputValue('');
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen && inputValue !== suffixes) {
      onChange(SEARCH_FILTERS_KEY.SUFFIXES, inputValue.replace(/\./g, ''));
    }
  }, [isOpen, inputValue, suffixes, onChange]);

  return (
    <div className="search-filter filter-by-suffix-container">
      <Dropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle
          tag="div"
          className={classNames('search-filter-toggle', {
            'active': isOpen && inputValue.length > 0,
            'highlighted': inputValue.length > 0,
          })}
          onClick={toggle}
          role="button"
          tabIndex={0}
          aria-haspopup={true}
          aria-expanded={isOpen}
        >
          <span className="filter-label" title={gettext('File suffix')}>{gettext('File suffix')}</span>
          <Icon symbol="down" className="w-3 h-3 ml-1" />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu filter-by-suffix-menu p-4">
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder={gettext('Separate multiple suffixes by ","(like sdoc, pdf)')}
              value={inputValue}
              autoFocus
              onChange={handleInput}
              onKeyDown={handleKeyDown}
            />
            {inputValue.length > 0 && (
              <button
                type="button"
                className="clear-icon-right"
                onClick={handleClearInput}
                onKeyDown={Utils.onKeyDown}
                aria-label={gettext('Clear')}
                title={gettext('Clear')}
              >
                <Icon symbol="close" />
              </button>
            )}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    </div>
  );
};

FilterBySuffix.propTypes = {
  suffixes: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FilterBySuffix;
