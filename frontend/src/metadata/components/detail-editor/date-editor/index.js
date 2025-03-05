import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DateEditor from '../../cell-editors/date-editor';
import ClickOutside from '../../../../components/click-outside';
import { getDateDisplayString, isCellValueChanged } from '../../../utils/cell';
import { CellType, DEFAULT_DATE_FORMAT } from '../../../constants';
import { gettext } from '../../../../utils/constants';
import { getEventClassName } from '../../../../utils/dom';

import './index.css';

const DetailDateEditor = ({ value, field, onChange: onChangeAPI, lang }) => {
  const [showEditor, setShowEditor] = useState(false);
  const format = useMemo(() => field?.data?.format || DEFAULT_DATE_FORMAT, [field]);
  const newValue = useRef(value);

  const openEditor = useCallback(() => {
    setShowEditor(true);
  }, []);

  const onChange = useCallback((value) => {
    newValue.current = value;
  }, []);

  const onClear = useCallback(() => {
    onChangeAPI(null);
    setShowEditor(false);
  }, [onChangeAPI]);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
    if (!isCellValueChanged(value, newValue.current, CellType.DATE)) return;
    onChangeAPI(newValue.current);
  }, [value, newValue, onChangeAPI]);

  const onBlur = useCallback((type) => {
    if (type !== 'enter') return;
    if (!isCellValueChanged(value, newValue.current, CellType.DATE)) return;
    onChangeAPI(newValue.current);
  }, [value, newValue, onChangeAPI]);

  const onClickOutside = useCallback((event) => {
    let className = getEventClassName(event);
    if (className.indexOf('rc-calendar') > -1 || !className && event.target.tagName === 'LI') return;
    closeEditor();
  }, [closeEditor]);

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
        <ClickOutside onClickOutside={onClickOutside}>
          <DateEditor lang={lang} format={format} value={value} onChange={onChange} onClose={closeEditor} onClear={onClear} onBlur={onBlur} />
        </ClickOutside>
      )}
    </>
  );
};

DetailDateEditor.propTypes = {
  value: PropTypes.string,
  field: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  lang: PropTypes.string,
};

export default DetailDateEditor;
