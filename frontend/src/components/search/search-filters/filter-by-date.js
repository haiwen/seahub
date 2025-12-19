import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import OpIcon from '../../../components/op-icon';
import Picker from '../../date-and-time-picker';
import ModalPortal from '../../modal-portal';
import { SEARCH_FILTERS_KEY, SEARCH_FILTER_BY_DATE_OPTION_KEY, SEARCH_FILTER_BY_DATE_TYPE_KEY } from '../../../constants';
import Icon from '../../icon';

const DATE_INPUT_WIDTH = 118;

const FilterByDate = ({ date, onChange }) => {
  const [value, setValue] = useState(date.value);
  const [isOpen, setIsOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isCustomDate, setIsCustomDate] = useState(date.value === SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM);
  const [time, setTime] = useState({
    from: date.from,
    to: date.to,
  });
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

  const label = useMemo(() => {
    if (!value || value.length === 0) return gettext('Date');
    return typeLabel;
  }, [typeLabel, value]);

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
  }, [type]);

  const onClearDate = useCallback(() => {
    setValue('');
    setIsCustomDate(false);
    setTime({
      from: null,
      to: null,
    });
    setIsOpen(false);
  }, []);

  const onOptionClick = useCallback((e) => {
    const option = Utils.getEventData(e, 'toggle') ?? e.currentTarget.getAttribute('data-toggle');
    if (option === value) return;
    const today = dayjs().endOf('day');
    const isCustomOption = option === SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM;
    setIsCustomDate(isCustomOption);
    setValue(option);
    setIsOpen(isCustomOption);
    switch (option) {
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.TODAY: {
        setTime({
          from: dayjs().startOf('day').unix(),
          to: today.unix()
        });
        break;
      }
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_7_DAYS: {
        setTime({
          from: dayjs().subtract(6, 'day').startOf('day').unix(),
          to: today.unix()
        });
        break;
      }
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.LAST_30_DAYS: {
        setTime({
          from: dayjs().subtract(30, 'day').startOf('day').unix(),
          to: today.unix()
        });
        break;
      }
      case SEARCH_FILTER_BY_DATE_OPTION_KEY.CUSTOM: {
        setTime({
          from: null,
          to: null,
        });
        break;
      }
    }
  }, [value]);

  const disabledStartDate = useCallback((startDate) => {
    if (!startDate) return false;
    const today = dayjs();
    const endValue = time.to;

    if (!endValue) {
      return startDate.isAfter(today);
    }
    return endValue.isBefore(startDate) || startDate.isAfter(today);
  }, [time]);

  const disabledEndDate = useCallback((endDate) => {
    if (!endDate) return false;
    const today = dayjs().endOf('day');
    const startValue = time.from;
    if (!startValue) {
      return endDate.isAfter(today);
    }
    return endDate.isBefore(startValue) || endDate.isAfter(today);
  }, [time]);

  useEffect(() => {
    if (!isOpen) {
      if (type !== date.type || time.from !== date.from || time.to !== date.to) {
        onChange(SEARCH_FILTERS_KEY.DATE, {
          type,
          value,
          from: time.from,
          to: time.to,
        });
      }
    }
  }, [isOpen, date, time, type, value, onChange]);

  return (
    <div className="search-filter filter-by-date-container">
      <Dropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle
          tag="div"
          className={classNames('search-filter-toggle', {
            'active': isOpen && value,
            'highlighted': value,
          })}
          onClick={toggle}
          tabIndex={0}
          role="button"
          aria-haspopup={true}
          aria-expanded={isOpen}
        >
          <span className="filter-label" style={{ maxWidth: 300 }} title={label}>{label}</span>
          <Icon symbol="down" className="w-3 h-3 ml-1" />
        </DropdownToggle>
        <ModalPortal>
          <DropdownMenu className="search-filter-menu filter-by-date-menu">
            <div className="filter-by-date-menu-toolbar">
              <Dropdown isOpen={isTypeOpen} toggle={toggleType}>
                <DropdownToggle
                  tag="div"
                  className="search-filter-toggle filter-by-date-type-toggle"
                  tabIndex={0}
                  role="button"
                  aria-haspopup={true}
                  aria-expanded={isTypeOpen}
                >
                  <span className="filter-label">{typeLabel}</span>
                  <Icon symbol="down" className="ml-1" />
                </DropdownToggle>
                <DropdownMenu>
                  {typeOptions.map((option) => {
                    const isSelected = option.key === type;
                    return (
                      <DropdownItem key={option.key} data-toggle={option.key} onClick={onChangeType}>
                        {option.label}
                        {isSelected && <Icon symbol="check-thin" className="dropdown-item-tick" />}
                      </DropdownItem>
                    );
                  })}
                </DropdownMenu>
              </Dropdown>
              <OpIcon
                className="op-icon"
                title={gettext('Delete')}
                symbol="delete1"
                op={onClearDate}
              />
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
                  {isSelected && <Icon symbol="check-thin" className="dropdown-item-tick" />}
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
                    value={time.from}
                    onChange={(value) => setTime({ ...time, from: value?.startOf('day') })}
                    inputWidth={DATE_INPUT_WIDTH}
                  />
                </div>
                <div className="custom-date-container">
                  <div className="custom-date-label">{gettext('End date')}</div>
                  <Picker
                    showHourAndMinute={false}
                    disabledDate={disabledEndDate}
                    value={time.to}
                    onChange={(value) => setTime({ ...time, to: value?.endOf('day') })}
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
  onChange: PropTypes.func.isRequired,
};

export default FilterByDate;
