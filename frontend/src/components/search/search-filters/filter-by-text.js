import React, { useCallback, useMemo, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import ModalPortal from '../../../components/modal-portal';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import { SEARCH_FILTERS_KEY } from '../../../constants';

const FilterByText = ({ searchFilenameOnly, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(searchFilenameOnly ? SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY : SEARCH_FILTERS_KEY.SEARCH_FILENAME_AND_CONTENT);

  const options = useMemo(() => {
    return [
      {
        key: SEARCH_FILTERS_KEY.SEARCH_FILENAME_AND_CONTENT,
        label: gettext('File name and content'),
      }, {
        key: SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY,
        label: gettext('File name only'),
      }
    ];
  }, []);
  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const onOptionClick = useCallback((e) => {
    const option = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    setValue(option);
    const isSearchFilenameOnly = option === SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY;
    onChange(SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY, isSearchFilenameOnly);
  }, [onChange]);

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

FilterByText.propTypes = {
  searchFilenameOnly: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FilterByText;
