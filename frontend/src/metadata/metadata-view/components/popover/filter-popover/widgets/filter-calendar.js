import React from 'react';
import PropTypes from 'prop-types';
import { SfFilterCalendar } from '@seafile/sf-metadata-ui-component';
import { getDateColumnFormat } from '../../../../utils/column-utils';

const FilterCalendar = ({ value, filterColumn, isReadOnly, onChange }) => {
  const format = getDateColumnFormat(filterColumn).trim();
  const lang = window.sfMetadataContext.getSetting('lang');
  return (
    <SfFilterCalendar
      isReadOnly={isReadOnly}
      format={format}
      lang={lang}
      value={value}
      onChange={onChange}
      zIndex={1061}
    />
  );
};

FilterCalendar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  filterColumn: PropTypes.object.isRequired,
  isReadOnly: PropTypes.bool,
};

export default FilterCalendar;
