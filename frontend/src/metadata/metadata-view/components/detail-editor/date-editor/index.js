import React, { useCallback, useMemo, useState } from 'react';
import { SfCalendar } from '@seafile/sf-metadata-ui-component';
import PropTypes from 'prop-types';
import { DEFAULT_DATE_FORMAT, getDateDisplayString } from '../../../_basic';
import { gettext } from '../../../utils';

import './index.css';

const DateEditor = ({ value, field, onChange: onChangeAPI, lang }) => {
  const [showEditor, setShowEditor] = useState(false);
  const format = useMemo(() => field?.data?.format || DEFAULT_DATE_FORMAT, [field]);

  const openEditor = useCallback(() => {
    setShowEditor(true);
  }, []);

  const onChange = useCallback((newValue) => {
    onChangeAPI(newValue);
  }, [onChangeAPI]);

  const onClear = useCallback(() => {
    onChangeAPI(null);
    setShowEditor(false);
  }, [onChangeAPI]);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
  }, []);

  return (
    <>
      <div
        className="sf-metadata-property-detail-editor sf-metadata-date-property-detail-editor"
        placeholder={gettext('Empty')}
        onClick={openEditor}
      >
        {getDateDisplayString(value, format)}
      </div>
      {showEditor && (
        <SfCalendar lang={lang} format={format} value={value} onChange={onChange} onClose={closeEditor} onClear={onClear} />
      )}

    </>
  );
};

DateEditor.propTypes = {
  value: PropTypes.string,
  field: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  lang: PropTypes.string,
};

export default DateEditor;
