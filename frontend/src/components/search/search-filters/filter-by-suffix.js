import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import ModalPortal from '../../modal-portal';

const FilterBySuffix = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const label = useMemo(() => {
    if (value) {
      return `${gettext('File suffix: ')} ${value}`;
    }
    return gettext('File suffix');
  }, [value]);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const handleInput = useCallback((e) => {
    setValue(e.target.value);
    onSelect('suffix', e.target.value);
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
        <DropdownToggle tag="div" className="search-filter-toggle">
          <div className="filter-label" title={label}>{label}</div>
          {!value && <i className="sf3-font sf3-font-down sf3-font pl-1" />}
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu suffix-dropdown-menu">
            <div className="input-container">
              <input
                ref={inputRef}
                type="text"
                placeholder={gettext('Filter by file suffix (e.g. sdoc)')}
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
