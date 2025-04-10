import React, { useCallback, useMemo, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import ModalPortal from '../../../components/modal-portal';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';

const TEXT_FILTER_KEY = {
  SEARCH_FILENAME_AND_CONTENT: 'search_filename_and_content',
  SEARCH_FILENAME_ONLY: 'search_filename_only',
};

const FilterByText = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(TEXT_FILTER_KEY.SEARCH_FILENAME_AND_CONTENT);

  const options = useMemo(() => {
    return [
      {
        key: TEXT_FILTER_KEY.SEARCH_FILENAME_AND_CONTENT,
        label: gettext('File name and content'),
      }, {
        key: TEXT_FILTER_KEY.SEARCH_FILENAME_ONLY,
        label: gettext('File name only'),
      }
    ];
  }, []);
  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const onOptionClick = useCallback((e) => {
    const option = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    setValue(option);
    const isSearchFilenameOnly = option === TEXT_FILTER_KEY.SEARCH_FILENAME_ONLY;
    onSelect('search_filename_only', isSearchFilenameOnly);
  }, [onSelect]);

  const label = options.find((option) => option.key === value).label;

  return (
    <div className="search-filter filter-by-text-container">
      <Dropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle tag="div" className="search-filter-toggle">
          <div className="filter-label" title={label}>{label}</div>
          <i className="sf3-font sf3-font-down sf3-font pl-1" />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu filter-by-text-menu">
            {options.map((option) => {
              const isSelected = option.key === value;
              return (
                <DropdownItem key={option.key} data-toggle={option.key} onClick={onOptionClick}>
                  {option.label}
                  {isSelected && <i className="dropdown-item-tick sf2-icon-tick"></i>}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    </div>
  );
};

export default FilterByText;
