import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import dayjs from 'dayjs';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import Picker from '../../date-and-time-picker';
import ModalPortal from '../../modal-portal';
import { SEARCH_FILTERS_KEY, SEARCH_FILTER_BY_DATE_OPTION_KEY, SEARCH_FILTER_BY_DATE_TYPE_KEY } from '../../../constants';

const DATE_INPUT_WIDTH = 118;

const FilterByDate = ({ date, onSelect }) => {
  const [value, setValue] = useState(date.value);
  const [isOpen, setIsOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isCustomDate, setIsCustomDate] = useState(date.value === SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM);
  const [type, setType] = useState(date.type);

  const typeLabel = useMemo(() => {
    switch (type) {
      case SEARCH_FILTER_BY_DATE_TYPE_KEY.CREATE_TIME:
        return gettext('Create time');
      case SEARCH_FILTER_BY_DATE_TYPE_KEY.LAST_MODIFIED_TIME:
        return gettext('Last modified time');
      default:
        return gettext('Create time');
    }
  }, [type]);

  const typeOptions = useMemo(() => {
    return [
      {
        key: SEARCH_FILTER_BY_DATE_TYPE_KEY.CREATE_TIME,
        label: gettext('Create time'),
      }, {
        key: SEARCH_FILTER_BY_DATE_TYPE_KEY.LAST_MODIFIED_TIME,
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
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.TODAY:
        return `${prefix}${formatDate(today)}`;
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_7_DAYS:
        return `${prefix}${formatDate(today.subtract(6, 'day'))} - ${formatDate(today)}`;
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_30_DAYS:
        return `${prefix}${formatDate(today.subtract(29, 'day'))} - ${formatDate(today)}`;
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM:
        return date.start && date.end
          ? `${prefix}${formatDate(date.start)} - ${formatDate(date.end)}`
          : gettext('Select date range');
      default:
        return gettext('Date');
    }
  }, [date, value, typeLabel]);

  const options = useMemo(() => {
    return [
      {
        key: SEARCH_FILTER_BY_DATE_OPTION_KEY.TODAY,
        label: gettext('Today'),
      }, {
        key: SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_7_DAYS,
        label: gettext('Last 7 days'),
      }, {
        key: SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_30_DAYS,
        label: gettext('Last 30 days'),
      },
      'Divider',
      {
        key: SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM,
        label: gettext('Custom time'),
      },
    ];
  }, []);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const toggleType = useCallback(() => setIsTypeOpen(!isTypeOpen), [isTypeOpen]);

  const onChangeType = useCallback((e) => {
    const option = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    if (option === type) return;
    setType(option);
    onSelect(SEARCH_FILTERS_KEY.DATE, {
      ...date,
      type: option,
    });
  }, [type, onSelect, date]);

  const onClearDate = useCallback(() => {
    setValue('');
    setIsCustomDate(false);
    onSelect(SEARCH_FILTERS_KEY.DATE, '');
  }, [onSelect]);

  const onOptionClick = useCallback((e) => {
    const option = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    if (option === value) return;
    const today = dayjs().endOf('day');
    setIsCustomDate(option === SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM);
    setValue(option);
    switch (option) {
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.TODAY: {
        onSelect(SEARCH_FILTERS_KEY.DATE, {
          value: option,
          start: dayjs().startOf('day').unix(),
          end: today.unix()
        });
        break;
      }
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_7_DAYS: {
        onSelect(SEARCH_FILTERS_KEY.DATE, {
          value: option,
          start: dayjs().subtract(6, 'day').startOf('day').unix(),
          end: today.unix()
        });
        break;
      }
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_30_DAYS: {
        onSelect(SEARCH_FILTERS_KEY.DATE, {
          value: option,
          start: dayjs().subtract(30, 'day').startOf('day').unix(),
          end: today.unix()
        });
        break;
      }
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM: {
        onSelect(SEARCH_FILTERS_KEY.DATE, {
          value: option,
          start: null,
          end: null,
        });
        break;
      }
    }
  }, [value, onSelect]);

  const disabledStartDate = useCallback((startDate) => {
    if (!startDate) return false;
    const today = dayjs();
    const endValue = date.end;

    if (!endValue) {
      return startDate.isAfter(today);
    }
    return endValue.isBefore(startDate) || startDate.isAfter(today);
  }, [date]);

  const disabledEndDate = useCallback((endDate) => {
    if (!endDate) return false;
    const today = dayjs();
    const startValue = date.start;
    if (!startValue) {
      return endDate.isAfter(today);
    }
    return endDate.isBefore(startValue) || endDate.isAfter(today);
  }, [date]);

  const onChangeCustomDate = useCallback((customDate) => {
    const newDate = {
      ...date,
      ...customDate,
    };
    onSelect(SEARCH_FILTERS_KEY.DATE, newDate);
  }, [date, onSelect]);

  return (
    <div className="search-filter filter-by-date-container">
      <Dropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle tag="div" className="search-filter-toggle" onClick={toggle}>
          <div className="filter-label" style={{ maxWidth: 300 }} title={label}>{label}</div>
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
                      <DropdownItem key={option.key} data-toggle={option.key} onClick={onChangeType}>
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
                    value={date.start}
                    onChange={(value) => onChangeCustomDate({ start: value })}
                    inputWidth={DATE_INPUT_WIDTH}
                  />
                </div>
                <div className="custom-date-container">
                  <div className="custom-date-label">{gettext('End date')}</div>
                  <Picker
                    showHourAndMinute={false}
                    disabledDate={disabledEndDate}
                    value={date.end}
                    onChange={(value) => onChangeCustomDate({ end: value })}
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

FilterByDate.propTypes = {
  date: PropTypes.shape({
    type: PropTypes.string,
    value: PropTypes.string,
    start: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    end: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  }),
  onSelect: PropTypes.func.isRequired,
};

export default FilterByDate;
