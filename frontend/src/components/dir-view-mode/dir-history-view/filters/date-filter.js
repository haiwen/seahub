import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import OpIcon from '../../../op-icon';
import Picker from '../../../date-and-time-picker';
import Icon from '../../../icon';
import { HISTORY_MODE } from '../../constants';

const DATE_INPUT_WIDTH = 118;

const DATE_OPTION = {
  TODAY: 'today',
  LAST_7_DAYS: 'last-7-days',
  LAST_30_DAYS: 'last-30-days',
  CUSTOM: 'custom',
};

const HistoryDateFilter = ({ mode = HISTORY_MODE, value: propsValue = { value: '', from: null, to: null }, onChange }) => {
  const [value, setValue] = useState(propsValue.value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomDate, setIsCustomDate] = useState(propsValue.value === DATE_OPTION.CUSTOM);
  const [time, setTime] = useState({
    from: propsValue.from,
    to: propsValue.to,
  });

  const label = useMemo(() => {
    if (!value || value.length === 0) return gettext('Date');
    switch (value) {
      case DATE_OPTION.TODAY:
        return gettext('Today');
      case DATE_OPTION.LAST_7_DAYS:
        return gettext('Last 7 days');
      case DATE_OPTION.LAST_30_DAYS:
        return gettext('Last 30 days');
      case DATE_OPTION.CUSTOM:
        return gettext('Custom time');
      default:
        return gettext('Date');
    }
  }, [value]);

  const options = useMemo(() => {
    return [
      {
        key: DATE_OPTION.TODAY,
        label: gettext('Today'),
      }, {
        key: DATE_OPTION.LAST_7_DAYS,
        label: gettext('Last 7 days'),
      }, {
        key: DATE_OPTION.LAST_30_DAYS,
        label: gettext('Last 30 days'),
      },
      'Divider',
      {
        key: DATE_OPTION.CUSTOM,
        label: gettext('Custom time'),
      },
    ];
  }, []);

  const toggle = useCallback((e) => {
    if (isCustomDate && isOpen) {
      e && e.preventDefault();
      e && e.stopPropagation();
      return;
    }
    setIsOpen(!isOpen);
  }, [isOpen, isCustomDate]);

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
    const isCustomOption = option === DATE_OPTION.CUSTOM;
    setIsCustomDate(isCustomOption);
    setValue(option);
    setIsOpen(isCustomOption);
    switch (option) {
      case DATE_OPTION.TODAY: {
        setTime({
          from: dayjs().startOf('day').unix(),
          to: today.unix()
        });
        break;
      }
      case DATE_OPTION.LAST_7_DAYS: {
        setTime({
          from: dayjs().subtract(6, 'day').startOf('day').unix(),
          to: today.unix()
        });
        break;
      }
      case DATE_OPTION.LAST_30_DAYS: {
        setTime({
          from: dayjs().subtract(29, 'day').startOf('day').unix(),
          to: today.unix()
        });
        break;
      }
      case DATE_OPTION.CUSTOM: {
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
      if (time.from !== propsValue.from || time.to !== propsValue.to) {
        onChange({
          value,
          from: time.from,
          to: time.to,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, time, value]);

  useEffect(() => {
    if (isCustomDate) {
      if (time.from !== propsValue.from || time.to !== propsValue.to) {
        onChange({
          value,
          from: time.from,
          to: time.to,
        });
      }
      if (time.from && time.to) {
        setIsOpen(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomDate, time, value, propsValue.from, propsValue.to]);

  const copyRight = mode === HISTORY_MODE ? gettext('Create time') : gettext('Deleted time');

  return (
    <div className="history-date-filter-container">
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
        <DropdownMenu
          className="search-filter-menu filter-by-date-menu"
          onMouseDown={(e) => {
            if (isCustomDate && e.target.closest('.custom-date-container')) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div className="filter-by-date-menu-toolbar">
            <span className="filter-by-date-toolbar-label">{copyRight}</span>
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
      </Dropdown>
    </div>
  );
};

HistoryDateFilter.propTypes = {
  value: PropTypes.shape({
    value: PropTypes.string,
    from: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    to: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  }),
  onChange: PropTypes.func.isRequired,
};

export default HistoryDateFilter;

