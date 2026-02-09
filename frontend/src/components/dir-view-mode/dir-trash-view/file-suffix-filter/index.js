import React, { useCallback, useRef, useState } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Utils } from '../../../../utils/utils';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../icon';

import './index.css';

const FilterBySuffix = ({ suffixes, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(suffixes);
  const inputRef = useRef(null);
  const btnRef = useRef(null);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const handleInput = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const onBlur = useCallback((e) => {
    onChange(inputValue ? inputValue.trim() : '');
  }, [inputValue, onChange]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      onChange(inputValue ? inputValue.trim() : '');
      setIsOpen(false);
    }
  }, [inputValue, onChange]);

  const handleClearInput = useCallback(() => {
    setInputValue('');
    onChange('');
    setIsOpen(false);
  }, [onChange]);

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
        <DropdownMenu className="search-filter-menu filter-by-suffix-menu p-4">
          <input
            ref={inputRef}
            type="text"
            className="form-control"
            placeholder={gettext('Separate multiple suffixes by ","(like sdoc, pdf)')}
            value={inputValue}
            autoFocus
            onChange={handleInput}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
          />
          {inputValue.length > 0 && (
            <button
              type="button"
              ref={btnRef}
              className="clear-icon-right"
              onMouseDown={handleClearInput}
              onKeyDown={Utils.onKeyDown}
              aria-label={gettext('Clear')}
              title={gettext('Clear')}
            >
              <Icon symbol="close" />
            </button>
          )}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};

FilterBySuffix.propTypes = {
  suffixes: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FilterBySuffix;
