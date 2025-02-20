import React, { forwardRef, useImperativeHandle, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormFeedback, Label } from 'reactstrap';
import classnames from 'classnames';
import Icon from '../../../../../components/icon';
import { gettext } from '../../../../../utils/constants';
import { CellType, COLUMNS_ICON_CONFIG, DEFAULT_DATE_FORMAT, DEFAULT_SHOOTING_TIME_FORMAT, PRIVATE_COLUMN_KEY,
  DEFAULT_RATE_DATA,
} from '../../../../constants';
import { getColumnDisplayName } from '../../../../utils/column';
import ColumnTypes from './column-types';

import './index.css';

const COLUMNS = [
  {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_COLLABORATORS),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_COLLABORATORS,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_REVIEWER),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_REVIEWER,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.OWNER),
    unique: true,
    key: PRIVATE_COLUMN_KEY.OWNER,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME,
    canChangeName: false,
    data: { format: DEFAULT_DATE_FORMAT },
    groupby: 'predefined'
  }, {
  //   icon: COLUMNS_ICON_CONFIG[CellType.TEXT],
  //   type: CellType.TEXT,
  //   name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_KEYWORDS),
  //   unique: true,
  //   key: PRIVATE_COLUMN_KEY.FILE_KEYWORDS,
  //   canChangeName: false,
  //   groupby: 'predefined'
  // }, {
    icon: COLUMNS_ICON_CONFIG[CellType.LONG_TEXT],
    type: CellType.LONG_TEXT,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_DESCRIPTION,
    canChangeName: false,
    groupby: 'predefined'
  }, {
  //   icon: COLUMNS_ICON_CONFIG[CellType.CHECKBOX],
  //   type: CellType.CHECKBOX,
  //   name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_EXPIRED),
  //   unique: true,
  //   key: PRIVATE_COLUMN_KEY.FILE_EXPIRED,
  //   canChangeName: false,
  //   groupby: 'predefined'
  // }, {
    icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT],
    type: CellType.SINGLE_SELECT,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_STATUS),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_STATUS,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.CAPTURE_TIME),
    unique: true,
    key: PRIVATE_COLUMN_KEY.CAPTURE_TIME,
    canChangeName: false,
    data: { format: DEFAULT_SHOOTING_TIME_FORMAT },
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.RATE],
    type: CellType.RATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_RATE),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_RATE,
    canChangeName: false,
    data: DEFAULT_RATE_DATA,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.TEXT],
    type: CellType.TEXT,
    name: gettext('Text'),
    canChangeName: true,
    key: CellType.TEXT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.LONG_TEXT],
    type: CellType.LONG_TEXT,
    name: gettext('Long text'),
    canChangeName: true,
    key: CellType.LONG_TEXT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.NUMBER],
    type: CellType.NUMBER,
    name: gettext('Number'),
    canChangeName: true,
    key: CellType.NUMBER,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: gettext('Collaborator'),
    canChangeName: true,
    key: CellType.COLLABORATOR,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.CHECKBOX],
    type: CellType.CHECKBOX,
    name: gettext('Checkbox'),
    canChangeName: true,
    key: CellType.CHECKBOX,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: gettext('Date'),
    canChangeName: true,
    key: CellType.DATE,
    data: { format: DEFAULT_DATE_FORMAT },
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT],
    type: CellType.SINGLE_SELECT,
    name: gettext('Single select'),
    canChangeName: true,
    key: CellType.SINGLE_SELECT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.MULTIPLE_SELECT],
    type: CellType.MULTIPLE_SELECT,
    name: gettext('Multiple select'),
    canChangeName: true,
    key: CellType.MULTIPLE_SELECT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.RATE],
    type: CellType.RATE,
    name: gettext('Rate'),
    canChangeName: true,
    key: CellType.RATE,
    data: DEFAULT_RATE_DATA,
    groupby: 'basics',
  },
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
    onChange(COLUMNS.find(c => c.groupby === 'basics') || COLUMNS[0]);
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
            <Icon symbol={column.icon} className="mr-2" />
            <span>{column.name}</span>
          </div>
          <i className='sf3-font sf3-font-down' aria-hidden="true"></i>
        </div>
        {error && (<FormFeedback>{error}</FormFeedback>)}
      </FormGroup>
      {isPopoverShow && targetRef.current && (
        <ColumnTypes
          columns={COLUMNS}
          column={column}
          target={targetRef.current}
          parentWidth={parentWidth}
          onChange={onSelectColumn}
          onToggle={close}
        />
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
