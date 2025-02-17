import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { FormGroup, Label } from 'reactstrap';
import { CustomizeSelect } from '@seafile/sf-metadata-ui-component';
import Switch from '../../../../../../components/common/switch';
import { gettext } from '../../../../../../utils/constants';
import { getDateDisplayString } from '../../../../../utils/cell';
import { DEFAULT_DATE_FORMAT, PRIVATE_COLUMN_KEY } from '../../../../../constants';

import './index.css';

const DateData = ({ value, column, onChange }) => {
  const isShootingTime = column.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME;
  const { format } = value || { format: DEFAULT_DATE_FORMAT };
  const today = useMemo(() => {
    let todayDate = new Date();
    let year = todayDate.getFullYear();
    let month = todayDate.getMonth() + 1;
    let date = todayDate.getDate();
    let hour = todayDate.getHours();
    let minute = todayDate.getMinutes();
    month = month > 9 ? month : `0${month}`;
    date = date > 9 ? date : `0${date}`;
    hour = hour > 9 ? hour : `0${hour}`;
    minute = minute > 9 ? minute : `0${minute}`;
    return `${year}-${month}-${date} ${hour}:${minute}`;
  }, []);

  const options = useMemo(() => {
    const timeUnit = isShootingTime ? 'HH:mm:ss' : '';
    return [
      {
        label: `${gettext('ISO')} (${getDateDisplayString(today, classnames('YYYY-MM-DD', timeUnit))})`,
        value: classnames('YYYY-MM-DD', timeUnit)
      },
      {
        label: `${gettext('US')} (${getDateDisplayString(today, classnames('M/D/YYYY', timeUnit))})`,
        value: classnames('M/D/YYYY', timeUnit)
      },
      {
        label: `${gettext('European')} (${getDateDisplayString(today, classnames('DD/MM/YYYY', timeUnit))})`,
        value: classnames('DD/MM/YYYY', timeUnit)
      },
      {
        label: `${gettext('Germany Russia etc')} (${getDateDisplayString(today, classnames('DD.MM.YYYY', timeUnit))})`,
        value: classnames('DD.MM.YYYY', timeUnit)
      }
    ];
  }, [isShootingTime, today]);

  const onFormatChange = useCallback((o) => {
    onChange({ ...value, format: o });
  }, [value, onChange]);

  const onMinuteChange = useCallback((v) => {
    let newFormat = format || 'YYYY-MM-DD';
    const formats = format.split(' ');
    if (formats.length === 1) newFormat = formats[0] + ' HH:mm';
    if (formats.length === 2) newFormat = formats[0];
    onChange({ format: newFormat });
  }, [format, onChange]);

  // const onSecondChange = useCallback((v) => {
  //   let newFormat = format || 'YYYY-MM-DD HH:mm';
  //   newFormat = format.indexOf('ss') === -1 ? newFormat + ':ss' : newFormat.slice(0, -3);
  //   onChange({ format: newFormat });
  // }, [format, onChange]);

  const yearFormat = (typeof format === 'string') ? format.split(' ')[0] : 'YYYY-MM-DD';
  const selectedValue = options.find(o => o.value === yearFormat) || options[0];
  const showMinute = format ? format.indexOf('HH:mm') > -1 : false;

  return (
    <div className="sf-metadata-column-data-settings sf-metadata-date-column-data-settings">
      <FormGroup className="">
        <Label>{gettext('Format')}</Label>
        <CustomizeSelect value={selectedValue} options={options} onSelectOption={onFormatChange} />
      </FormGroup>
      {!isShootingTime && (
        <>
          <div className="pb-4">
            <Switch
              checked={showMinute}
              size="large"
              textPosition="right"
              className="sf-metadata-date-column-data-minute w-100"
              onChange={onMinuteChange}
              placeholder={gettext('Accurate to minute')} />
          </div>
          {/* <div className="pb-4">
            <Switch
              disabled={!showMinute}
              checked={format ? format.indexOf('HH:mm:ss') > -1 : false}
              size="large"
              textPosition="right"
              className="sf-metadata-date-column-data-minute w-100"
              onChange={onSecondChange}
              placeholder={gettext('Accurate to second')} />
          </div> */}
        </>
      )}
    </div>
  );
};

DateData.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
};

export default DateData;
