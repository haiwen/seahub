import React, { useCallback, useRef, useState } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import ModalPortal from '../../modal-portal';
import classNames from 'classnames';

const FilterBySuffix = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const handleInput = useCallback((e) => {
    setValue(e.target.value);
    const suffixes = e.target.value.split(',').map(suffix => suffix.trim()).filter(Boolean);
    onSelect('suffixes', suffixes);
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
          'active': isOpen || value,
          'highlighted': isOpen,
        })} onClick={toggle}>
          <div className="filter-label" title={gettext('File suffix')}>{gettext('File suffix')}</div>
          <i className="sf3-font sf3-font-down sf3-font pl-1" />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu filter-by-suffix-menu">
            <div className="input-container">
              <input
                ref={inputRef}
                type="text"
                placeholder={gettext('Seperate multiple suffixes by ","(like .sdoc, .pdf)')}
                value={value}
                autoFocus
                width={120}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
              />
            </div>
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    </div>
  );
};

export default FilterBySuffix;
