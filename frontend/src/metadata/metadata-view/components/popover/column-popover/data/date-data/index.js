import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CustomizeSelect } from '@seafile/sf-metadata-ui-component';
import { FormGroup, Label } from 'reactstrap';
import { gettext } from '../../../../../utils';
import { getDateDisplayString } from '../../../../../_basic';
import Switch from '../../../../../../../components/common/switch';

import './index.css';

const DateData = ({ value, onChange }) => {
  const { format } = value || { format: 'YYYY-MM-DD' };
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
    return [
      { label: `${gettext('ISO')} (${getDateDisplayString(today, 'YYYY-MM-DD')})`, value: 'YYYY-MM-DD' },
      { label: `${gettext('US')} (${getDateDisplayString(today, 'M/D/YYYY')})`, value: 'M/D/YYYY' },
      { label: `${gettext('European')} (${getDateDisplayString(today, 'DD/MM/YYYY')})`, value: 'DD/MM/YYYY' },
      { label: `${gettext('Germany Russia etc')} (${getDateDisplayString(today, 'DD.MM.YYYY')})`, value: 'DD.MM.YYYY' }
    ];
  }, [today]);

  const onFormatChange = useCallback((o) => {
    onChange({ ...value, format: o });
  }, [value, onChange]);

  const onMinuteChange = useCallback((v) => {
    let newFormat = format || 'YYYY-MM-DD';
    const formats = format.split(' ');
    if (formats.length === 1) newFormat = format + ' HH:mm';
    if (formats.length === 2) newFormat = formats[0];
    onChange({ format: newFormat });
  }, [format, onChange]);

  useEffect(() => {
    if (format) return;
    onChange({ format: 'YYYY-MM-DD' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedValue = options.find(o => o.value === format) || options[0];

  return (
    <div className="sf-metadata-column-data-settings sf-metadata-date-column-data-settings">
      <FormGroup className="">
        <Label>{gettext('Format')}</Label>
        <CustomizeSelect value={selectedValue} options={options} onSelectOption={onFormatChange} />
      </FormGroup>
      <div className="pb-4">
        <Switch
          checked={format ? format.indexOf('HH:mm') > -1 : false}
          size="large"
          textPosition="right"
          className="sf-metadata-date-column-data-minute w-100"
          onChange={onMinuteChange}
          placeholder={gettext('Accurate to minute')} />
      </div>
    </div>
  );
};

DateData.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
};

export default DateData;
