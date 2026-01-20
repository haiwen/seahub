import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../../../../utils/constants';
import ModalPortal from '../../../../modal-portal';
import { SEARCH_FILTERS_KEY } from '../../../../../constants';
import IconBtn from '../../../../icon-btn';
import Icon from '../../../../icon';
import { Utils } from '../../../../../utils/utils';


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
      onChange(SEARCH_FILTERS_KEY.SUFFIXES, inputValue.replace(/\./g, ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="filter-label" title={gettext('File suffix')}>{gettext('File suffix')}</div>
          <Icon symbol="arrow-down" className="ml-1" />
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
              <IconBtn
                symbol="close"
                className="clear-icon-right"
                onClick={handleClearInput}
                onKeyDown={Utils.onKeyDown}
                aria-label={gettext('Clear')}
                title={gettext('Clear')}
              />
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
