import React, { useCallback, useMemo, useRef } from 'react';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import { getCellValueByColumn, getFileNameFromRecord, isCellValueChanged } from '../../../utils/cell';
import Icon from '../../../../components/icon';
import { CellType, COLUMNS_ICON_CONFIG, PRIVATE_COLUMN_KEYS } from '../../../constants';
import Text from './text';
import LongText from './long-text';
import CTime from './ctime';
import Number from './number';
import Date from './date';
import Creator from './creator';
import Collaborator from './collaborator';
import SingleSelect from './single-select';
import MultipleSelect from './multiple-select';
import Checkbox from './checkbox';
import Rate from './rate';
import Tags from './tags';
import Geolocation from './geolocation';
import { useMetadataView } from '../../../hooks/metadata-view';

import './index.css';

const COLUMN_TYPE_ITEM_MAP = {
  [CellType.FILE_NAME]: Text,
  [CellType.TEXT]: Text,
  [CellType.LONG_TEXT]: LongText,
  [CellType.CTIME]: CTime,
  [CellType.MTIME]: CTime,
  [CellType.DATE]: Date,
  [CellType.NUMBER]: Number,
  [CellType.CREATOR]: Creator,
  [CellType.LAST_MODIFIER]: Creator,
  [CellType.COLLABORATOR]: Collaborator,
  [CellType.SINGLE_SELECT]: SingleSelect,
  [CellType.MULTIPLE_SELECT]: MultipleSelect,
  [CellType.CHECKBOX]: Checkbox,
  [CellType.RATE]: Rate,
  [CellType.TAGS]: Tags,
  [CellType.GEOLOCATION]: Geolocation,
};

const ExpandedPropertiesDialog = ({ recordId, columns, toggle }) => {
  const containerRef = useRef(null);
  const { metadata, modifyRecord, modifyColumnData } = useMetadataView();
  const record = useMemo(() => metadata.id_row_map[recordId], [metadata, recordId]);
  const filename = useMemo(() => getFileNameFromRecord(record), [record]);

  const onCommit = useCallback((column, value) => {
    const rowId = recordId;
    const columnKey = column.key;
    const columnName = column.name;
    const isPrivateKey = PRIVATE_COLUMN_KEYS.includes(columnKey);
    const updates = isPrivateKey ? { [columnKey]: value } : { [columnName]: value };
    const originalOldCellValue = getCellValueByColumn(record, column);
    if (!isCellValueChanged(originalOldCellValue, value, column.type)) return;
    const oldRowData = isPrivateKey ? { [columnKey]: originalOldCellValue } : { [columnName]: originalOldCellValue };
    const originalOldRowData = { [columnKey]: originalOldCellValue };
    const originalUpdates = { [columnKey]: value };
    modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData);
  }, [recordId, record, modifyRecord]);

  const closeBtn = (
    <button type="button" className="close seahub-modal-btn" data-dismiss="modal" aria-label={gettext('Close')} title={gettext('Close')} onClick={toggle}>
      <span className="seahub-modal-btn-inner">
        <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
      </span>
    </button>
  );
  return (
    <Modal innerRef={containerRef} isOpen={true} toggle={toggle} className="expanded-properties-dialog-container" contentClassName="h-100">
      <ModalHeader toggle={toggle} close={closeBtn}>{filename}</ModalHeader>
      <ModalBody className="expanded-properties-content-container" >
        <>
          {columns.map((column, idx) => {
            const { name, type } = column;
            const Component = COLUMN_TYPE_ITEM_MAP[type];
            return (
              <div key={idx} className="d-flex w-100 mb-4">
                <div className="col-3 icon-name-wrapper">
                  <span className="d-flex text-align-center">
                    <Icon symbol={COLUMNS_ICON_CONFIG[type]} className="mr-2" />
                  </span>
                  <span className="text-center">{name}</span>
                </div>
                <div className="col-9">
                  {Component && <Component record={record} column={column} columns={columns} containerRef={containerRef} onCommit={onCommit} modifyColumnData={modifyColumnData} />}
                </div>
              </div>
            );
          })}
        </>
      </ModalBody>
    </Modal>
  );
};

ExpandedPropertiesDialog.propTypes = {
  recordId: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  toggle: PropTypes.func.isRequired,
};

export default ExpandedPropertiesDialog;
