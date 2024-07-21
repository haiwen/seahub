import React, { forwardRef, useImperativeHandle, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormFeedback, Label } from 'reactstrap';
import classnames from 'classnames';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils';
import { CellType, COLUMNS_ICON_CONFIG, PRIVATE_COLUMN_KEY, COLUMNS_ICON_NAME } from '../../../../_basic';
import { getColumnName } from '../../../../utils/column-utils';
import ColumnTypes from './column-types';

import './index.css';

const COLUMNS = [
  { icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR], type: CellType.COLLABORATOR, name: getColumnName(PRIVATE_COLUMN_KEY.FILE_COLLABORATORS), unique: true, key: PRIVATE_COLUMN_KEY.FILE_COLLABORATORS, canChangeName: false, groupby: 'predefined' },
  { icon: COLUMNS_ICON_CONFIG[CellType.DATE], type: CellType.DATE, name: getColumnName(PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME), unique: true, key: PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME, canChangeName: false, groupby: 'predefined' },
  { icon: COLUMNS_ICON_CONFIG[CellType.TEXT], type: CellType.TEXT, name: getColumnName(PRIVATE_COLUMN_KEY.FILE_KEYWORDS), unique: true, key: PRIVATE_COLUMN_KEY.FILE_KEYWORDS, canChangeName: false, groupby: 'predefined' },
  { icon: COLUMNS_ICON_CONFIG[CellType.LONG_TEXT], type: CellType.LONG_TEXT, name: getColumnName(PRIVATE_COLUMN_KEY.FILE_SUMMARY), unique: true, key: PRIVATE_COLUMN_KEY.FILE_SUMMARY, canChangeName: false, groupby: 'predefined' },
  { icon: COLUMNS_ICON_CONFIG[CellType.CHECKBOX], type: CellType.CHECKBOX, name: getColumnName(PRIVATE_COLUMN_KEY.FILE_EXPIRED), unique: true, key: PRIVATE_COLUMN_KEY.FILE_EXPIRED, canChangeName: false, groupby: 'predefined' },
  { icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT], type: CellType.SINGLE_SELECT, name: getColumnName(PRIVATE_COLUMN_KEY.FILE_STATUS), unique: true, key: PRIVATE_COLUMN_KEY.FILE_STATUS, canChangeName: false, groupby: 'predefined' },
  { icon: COLUMNS_ICON_CONFIG[CellType.TEXT], type: CellType.TEXT, name: gettext(COLUMNS_ICON_NAME[CellType.TEXT]), canChangeName: true, key: CellType.TEXT, groupby: 'basics' },
  { icon: COLUMNS_ICON_CONFIG[CellType.CHECKBOX], type: CellType.CHECKBOX, name: gettext(COLUMNS_ICON_NAME[CellType.CHECKBOX]), canChangeName: true, key: CellType.CHECKBOX, groupby: 'basics' },
  { icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR], type: CellType.COLLABORATOR, name: gettext(COLUMNS_ICON_NAME[CellType.COLLABORATOR]), canChangeName: true, key: CellType.COLLABORATOR, groupby: 'basics' },
  { icon: COLUMNS_ICON_CONFIG[CellType.DATE], type: CellType.DATE, name: gettext(COLUMNS_ICON_NAME[CellType.DATE]), canChangeName: true, key: CellType.DATE, groupby: 'basics' },
  { icon: COLUMNS_ICON_CONFIG[CellType.LONG_TEXT], type: CellType.LONG_TEXT, name: gettext(COLUMNS_ICON_NAME[CellType.LONG_TEXT]), canChangeName: true, key: CellType.LONG_TEXT, groupby: 'basics' },
  { icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT], type: CellType.SINGLE_SELECT, name: gettext(COLUMNS_ICON_NAME[CellType.SINGLE_SELECT]), canChangeName: true, key: CellType.SINGLE_SELECT, groupby: 'basics' },
  { icon: COLUMNS_ICON_CONFIG[CellType.NUMBER], type: CellType.NUMBER, name: gettext(COLUMNS_ICON_NAME[CellType.NUMBER]), canChangeName: true, key: CellType.NUMBER, groupby: 'basics' },
];

// eslint-disable-next-line react/display-name
const Type = forwardRef(({ parentWidth, column, onChange }, ref) => {
  const [error, setError] = useState('');
  const [isPopoverShow, setPopoverShow] = useState(false);
  const targetRef = useRef(null);

  const toggle = useCallback((event) => {
    event && event.stopPropagation();
    event && event.nativeEvent.stopImmediatePropagation();
    setPopoverShow(!isPopoverShow);
  }, [isPopoverShow]);

  const close = useCallback(() => {
    setPopoverShow(false);
  }, []);

  const onSelectColumn = useCallback((column) => {
    onChange(column);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    setError: (error) => setError(error),
    getIsPopoverShow: () => isPopoverShow,
    setPopoverState: (state) => setPopoverShow(state),
  }), [isPopoverShow]);

  useEffect(() => {
    onChange(COLUMNS[6]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <FormGroup className={classnames('sf-metadata-column-settings-item', { 'is-invalid': error })}>
        <Label>{gettext('Type')}</Label>
        <div
          className={classnames('sf-metadata-column-type', { 'sf-metadata-column-type-focus': isPopoverShow })}
          ref={targetRef}
          onClick={toggle}
        >
          <div className="sf-metadata-column-type-info">
            <Icon iconName={column.icon} className="mr-2" />
            <span>{column.name}</span>
          </div>
          <Icon iconName="drop-down" />
        </div>
        {error && (<FormFeedback>{error}</FormFeedback>)}
      </FormGroup>
      {isPopoverShow && targetRef.current && (
        <ColumnTypes columns={COLUMNS} column={column} target={targetRef.current} parentWidth={parentWidth} onChange={onSelectColumn} onToggle={close} />
      )}
    </>
  );
});

Type.propTypes = {
  parentWidth: PropTypes.number,
  column: PropTypes.object,
  onChange: PropTypes.func,
};

export default Type;
