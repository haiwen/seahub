import React, { useCallback, useMemo, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import dayjs from 'dayjs';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import Picker from '../../date-and-time-picker';
import ModalPortal from '../../modal-portal';

const DATE_FILTER_TYPE_KEY = {
  CREATE_TIME: 'create_time',
  LAST_MODIFIED_TIME: 'last_modified_time',
};

const DATE_OPTION_KEY = {
  TODAY: 'today',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  CUSTOM: 'custom',
};

const DATE_INPUT_WIDTH = 118;

const FilterByDate = ({ onSelect }) => {
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState({
    start: null,
    end: null,
  });
  const [type, setType] = useState(DATE_FILTER_TYPE_KEY.CREATE_TIME);

  const typeLabel = useMemo(() => {
    switch (type) {
      case DATE_FILTER_TYPE_KEY.CREATE_TIME:
        return gettext('Create time');
      case DATE_FILTER_TYPE_KEY.LAST_MODIFIED_TIME:
        return gettext('Last modified time');
      default:
        return gettext('Create time');
    }
  }, [type]);

  const typeOptions = useMemo(() => {
    return [
      {
        key: DATE_FILTER_TYPE_KEY.CREATE_TIME,
        label: gettext('Create time'),
      }, {
        key: DATE_FILTER_TYPE_KEY.LAST_MODIFIED_TIME,
        label: gettext('Last modified time'),
      }
    ];
  }, []);

  const label = useMemo(() => {
    if (!value || value.length === 0) return gettext('Date');
    const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');
    const today = dayjs();
    const prefix = `${typeLabel}: `;

    switch (value) {
      case DATE_OPTION_KEY.TODAY:
        return `${prefix}${formatDate(today)}`;
      case DATE_OPTION_KEY.LAST_7_DAYS:
        return `${prefix}${formatDate(today.subtract(6, 'day'))} - ${formatDate(today)}`;
      case DATE_OPTION_KEY.LAST_30_DAYS:
        return `${prefix}${formatDate(today.subtract(29, 'day'))} - ${formatDate(today)}`;
      case DATE_OPTION_KEY.CUSTOM:
        return customDate.start && customDate.end
          ? `${prefix}${formatDate(customDate.start)} - ${formatDate(customDate.end)}`
          : gettext('Select date range');
      default:
        return gettext('Date');
    }
  }, [value, customDate, typeLabel]);

  const options = useMemo(() => {
    return [
      {
        key: DATE_OPTION_KEY.TODAY,
        label: gettext('Today'),
      }, {
        key: DATE_OPTION_KEY.LAST_7_DAYS,
        label: gettext('Last 7 days'),
      }, {
        key: DATE_OPTION_KEY.LAST_30_DAYS,
        label: gettext('Last 30 days'),
      },
      'Divider',
      {
        key: DATE_OPTION_KEY.CUSTOM,
        label: gettext('Custom time'),
      },
    ];
  }, []);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const toggleType = useCallback(() => setIsTypeOpen(!isTypeOpen), [isTypeOpen]);

  const onClearDate = useCallback(() => {
    setValue('');
    setIsCustomDate(false);
    onSelect('date', '');
  }, [onSelect]);

  const onOptionClick = useCallback((e) => {
    const option = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    const today = dayjs().endOf('day');

    switch (option) {
      case DATE_OPTION_KEY.TODAY:
        setValue(option);
        setIsCustomDate(false);
        onSelect('date', {
          start: dayjs().startOf('day').unix(),
          end: today.unix()
        });
        break;
      case DATE_OPTION_KEY.LAST_7_DAYS:
        setValue(option);
        setIsCustomDate(false);
        onSelect('date', {
          start: dayjs().subtract(6, 'day').startOf('day').unix(),
          end: today.unix()
        });
        break;
      case DATE_OPTION_KEY.LAST_30_DAYS:
        setValue(option);
        setIsCustomDate(false);
        onSelect('date', {
          start: dayjs().subtract(30, 'day').startOf('day').unix(),
          end: today.unix()
        });
        break;
      case DATE_OPTION_KEY.CUSTOM:
        setValue(DATE_OPTION_KEY.CUSTOM);
        setIsCustomDate(true);
        break;
    }
  }, [onSelect]);

  const disabledStartDate = useCallback((startDate) => {
    if (!startDate) return false;
    const today = dayjs();
    const endValue = customDate.end;

    if (!endValue) {
      return startDate.isAfter(today);
    }
    return endValue.isBefore(startDate) || startDate.isAfter(today);
  }, [customDate]);

  const disabledEndDate = useCallback((endDate) => {
    if (!endDate) return false;
    const today = dayjs();
    const startValue = customDate.start;
    if (!startValue) {
      return endDate.isAfter(today);
    }
    return endDate.isBefore(startValue) || endDate.isAfter(today);
  }, [customDate]);

  const onChangeCustomDate = useCallback((date) => {
    const newDate = {
      ...customDate,
      [date.type]: date.value,
    };
    setCustomDate(newDate);

    if (newDate.start && newDate.end) {
      onSelect('date', {
        start: newDate.start.unix(),
        end: newDate.end.unix(),
      });
    }
  }, [customDate, onSelect]);

  return (
    <div className="search-filter filter-by-date">
      <Dropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle tag="div" className="search-filter-toggle">
          <div className="filter-label" style={{ maxWidth: 200 }} title={label}>{label}</div>
          <i
            className="sf3-font sf3-font-down sf3-font pl-1"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu filter-by-date-menu">
            <div className="filter-by-date-menu-toolbar">
              <Dropdown isOpen={isTypeOpen} toggle={toggleType}>
                <DropdownToggle tag="div" className="search-filter-toggle filter-by-date-type-toggle">
                  <div className="filter-label">{typeLabel}</div>
                  <i
                    className="sf3-font sf3-font-down sf3-font pl-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleType();
                    }}
                  />
                </DropdownToggle>
                <DropdownMenu>
                  {typeOptions.map((option) => {
                    const isSelected = option.key === type;
                    return (
                      <DropdownItem key={option.key} data-toggle={option.key} onClick={() => setType(option.key)}>
                        {option.label}
                        {isSelected && <i className="dropdown-item-tick sf2-icon-tick"></i>}
                      </DropdownItem>
                    );
                  })}
                </DropdownMenu>
              </Dropdown>
              <div className="delete-btn" onClick={onClearDate}>
                <i className="op-icon sf3-font-delete1 sf3-font"></i>
              </div>
            </div>
            {options.map((option, i) => {
              const isSelected = option.key === value;
              if (option === 'Divider') return <div key={i} className="seafile-divider dropdown-divider"></div>;
              return (
                <DropdownItem
                  key={option.key}
                  tag="div"
                  tabIndex="-1"
                  data-toggle={option.key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onOptionClick}
                  toggle={false}
                >
                  {option.label}
                  {isSelected && <i className="dropdown-item-tick sf2-icon-tick"></i>}
                </DropdownItem>
              );
            })}
            {isCustomDate && (
              <div className="filter-by-date-custom-date-container">
                <div className="custom-date-container">
                  <div className="custom-date-label">{gettext('Start date')}</div>
                  <Picker
                    showHourAndMinute={false}
                    disabledDate={disabledStartDate}
                    value={customDate.start}
                    onChange={(value) => onChangeCustomDate({ type: 'start', value })}
                    inputWidth={DATE_INPUT_WIDTH}
                  />
                </div>
                <div className="custom-date-container">
                  <div className="custom-date-label">{gettext('End date')}</div>
                  <Picker
                    showHourAndMinute={false}
                    disabledDate={disabledEndDate}
                    value={customDate.end}
                    onChange={(value) => onChangeCustomDate({ type: 'end', value })}
                    inputWidth={DATE_INPUT_WIDTH}
                  />
                </div>
              </div>
            )}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    </div>
  );
};

export default FilterByDate;
