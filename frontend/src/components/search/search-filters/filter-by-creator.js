import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import isHotkey from 'is-hotkey';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import UserItem from './user-item';
import { seafileAPI } from '../../../utils/seafile-api';
import ModalPortal from '../../modal-portal';
import toaster from '../../toast';
import { SEARCH_FILTERS_KEY } from '../../../constants';

const FilterByCreator = ({ creatorList, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState(creatorList || []);
  const [searchValue, setSearchValue] = useState('');

  const toggle = useCallback((e) => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const displayOptions = useMemo(() => {
    if (!searchValue) return null;
    return options.filter((option) => {
      return option.name.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [options, searchValue]);

  const onSelectOption = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const name = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    let updated = [...selectedOptions];
    if (!updated.some((item) => item.name === name)) {
      const newOption = options.find((option) => option.name === name);
      updated = [...updated, newOption];
    } else {
      updated = updated.filter((option) => option.name !== name);
    }
    setSelectedOptions(updated);
    onSelect(SEARCH_FILTERS_KEY.CREATOR_LIST, updated);
    if (displayOptions.length === 1) {
      setSearchValue('');
    }
  }, [selectedOptions, displayOptions, options, onSelect]);

  const handleCancel = useCallback((e, name) => {
    const updated = selectedOptions.filter((option) => option.name !== name);
    setSelectedOptions(updated);
    onSelect(SEARCH_FILTERS_KEY.CREATOR_LIST, updated);
  }, [selectedOptions, onSelect]);

  const handleInputChange = useCallback((e) => {
    const v = e.target.value;
    setSearchValue(v);
    if (!selectedOptions) {
      setOptions([]);
    }
  }, [selectedOptions]);

  const handleInputKeyDown = useCallback((e) => {
    if (isHotkey('enter')(e)) {
      e.preventDefault();
      e.stopPropagation();
      setSearchValue('');
      toggle();
    }
  }, [toggle]);

  useEffect(() => {
    if (!searchValue) return;

    const getUsers = async () => {
      try {
        const res = await seafileAPI.searchUsers(searchValue);
        const userList = res.data.users
          .filter(user => user.name.toLowerCase().includes(searchValue.toLowerCase()));

        setOptions(userList);
      } catch (err) {
        toaster.danger(Utils.getErrorMsg(err));
      }
    };

    getUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="search-filter filter-by-creator-container">
      <Dropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle tag="div" className={classNames('search-filter-toggle', {
          'active': isOpen && selectedOptions.length > 0,
          'highlighted': selectedOptions.length > 0,
        })}>
          <div className="filter-label" title={gettext('Creator')}>{gettext('Creator')}</div>
          <i className="sf3-font sf3-font-down sf3-font pl-1" />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu filter-by-creator-menu">
            <div className="input-container">
              {selectedOptions.map((option) => (
                <UserItem
                  key={option.name}
                  user={option}
                  isCancellable={true}
                  onCancel={handleCancel}
                />
              ))}
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder={selectedOptions.length ? '' : gettext('Search user')}
                  value={searchValue}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                />
              </div>
            </div>
            {displayOptions && displayOptions.map((option) => (
              <DropdownItem
                key={option.name}
                tag="div"
                tabIndex="-1"
                data-toggle={option.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onSelectOption}
                toggle={false}
              >
                {isOpen && <UserItem user={option} />}
                {selectedOptions.includes(option.name) && <i className="dropdown-item-tick sf2-icon-tick"></i>}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    </div>
  );
};

FilterByCreator.propTypes = {
  creatorList: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default FilterByCreator;
