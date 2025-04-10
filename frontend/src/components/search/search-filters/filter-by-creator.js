import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import UserItem from './user-item';
import { seafileAPI } from '../../../utils/seafile-api';
import ModalPortal from '../../modal-portal';
import toaster from '../../toast';

const FilterByCreator = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState([]);
  const [searchValue, setSearchValue] = useState('');

  const label = useMemo(() => {
    if (!value || value.length === 0) return gettext('Creator');
    const label = [];
    value.forEach((v) => {
      const option = options.find((o) => o.key === v);
      if (option) {
        label.push(option.name);
      }
    });
    return `Creator: ${label.join(',')}`;
  }, [options, value]);

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
    const option = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    let updated = [...value];
    if (!updated.includes(option)) {
      updated = [...updated, option];
    } else {
      updated = updated.filter((v) => v !== option);
    }
    setValue(updated);
    onSelect('creator', updated);
    if (displayOptions.length === 1) {
      setSearchValue('');
    }
  }, [value, displayOptions, onSelect]);

  const handleCancel = useCallback((v) => {
    const updated = value.filter((item) => item !== v);
    setValue(updated);
    onSelect('creator', updated);
  }, [value, onSelect]);

  const handleInputChange = useCallback((e) => {
    const v = e.target.value;
    setSearchValue(v);
    if (!value) {
      setOptions([]);
    }
  }, [value]);

  useEffect(() => {
    if (!searchValue) return;

    const getUsers = async () => {
      try {
        const res = await seafileAPI.searchUsers(searchValue);
        const userList = res.data.users
          .filter(user => user.name.toLowerCase().includes(searchValue.toLowerCase()))
          .map(user => ({
            key: user.email,
            value: user.email,
            name: user.name,
            label: <UserItem user={user} />,
          }))
          .filter(user => !options.some(option => option.key === user.key));

        setOptions(prevOptions => [...prevOptions, ...userList]);
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
        <DropdownToggle tag="div" className="search-filter-toggle">
          <div className="filter-label" title={label}>{label}</div>
          <i className="sf3-font sf3-font-down sf3-font pl-1" />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu creator-dropdown-menu">
            <div className="input-container">
              {value.map((v) => {
                const option = options.find((o) => o.key === v);
                return option && (
                  <UserItem
                    key={option.key}
                    user={option}
                    isCancellable={true}
                    onCancel={() => handleCancel(v)}
                  />
                );
              })}
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder={value.length ? '' : gettext('Search user')}
                  value={searchValue}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            {displayOptions && displayOptions.map((option) => (
              <DropdownItem
                key={option.key}
                tag="div"
                tabIndex="-1"
                data-toggle={option.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onSelectOption}
                toggle={false}
              >
                {option.label}
                {value.includes(option.key) && <i className="dropdown-item-tick sf2-icon-tick"></i>}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    </div>
  );
};

FilterByCreator.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default FilterByCreator;
