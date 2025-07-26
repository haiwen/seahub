import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn, getDateDisplayString } from '../../../utils/cell';
import DateEditor from '../../cell-editors/date-editor';
import ClickOutside from '../../../../components/click-outside';
import { lang } from '../../../../utils/constants';

const Date = ({ record, column, onCommit }) => {
  const [isEditorShown, setIsEditorShown] = useState(false);
  const ref = useRef(null);
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);
  const displayValue = useMemo(() => getDateDisplayString(value, 'YYYY-MM-DD HH:mm:ss'), [value]);

  const onEdit = useCallback(() => {
    setIsEditorShown(true);
    ref.current.focus();
  }, []);

  const onChange = useCallback((value) => {
    if (value) {
      onCommit(column, value);
      setIsEditorShown(false);
    }
  }, [column, onCommit]);

  const onClear = useCallback(() => {
    onCommit(column, null);
    setIsEditorShown(false);
  }, [column, onCommit]);

  return (
    <ClickOutside onClickOutside={() => setIsEditorShown(false)}>
      <div tabIndex={0} ref={ref} className="form-control shrink text-nowrap select-option-container" onClick={onEdit}>
        {displayValue}
        {isEditorShown && (
          <DateEditor format="YYYY-MM-DD HH:mm:ss" value={value} lang={lang} onChange={onChange} onClear={onClear} />
        )}
      </div>
    </ClickOutside>
  );
};

Date.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  onCommit: PropTypes.func.isRequired,
};

export default Date;
