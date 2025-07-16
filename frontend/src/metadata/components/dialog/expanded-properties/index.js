import React, { useMemo } from 'react';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import { getFileNameFromRecord } from '../../../utils/cell';
import Icon from '../../../../components/icon';
import { CellType, COLUMNS_ICON_CONFIG } from '../../../constants';
import FileName from './filename';
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
import Link from './link';
import Tags from './tags';
import Geolocation from './geolocation';

import './index.css';

const COLUMN_TYPE_ITEM_MAP = {
  [CellType.FILE_NAME]: FileName,
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
  [CellType.LINK]: Link,
  [CellType.TAGS]: Tags,
  [CellType.GEOLOCATION]: Geolocation,
};

const ExpandedPropertiesDialog = ({ record, columns, toggle }) => {
  const filename = useMemo(() => getFileNameFromRecord(record), [record]);
  return (
    <Modal isOpen={true} toggle={toggle}>
      <ModalHeader>{filename}</ModalHeader>
      <ModalBody>
        <ul>
          {columns.map((column, idx) => {
            const { key, name, type } = column;
            const Component = COLUMN_TYPE_ITEM_MAP[type];
            return (
              <li key={idx} className="d-flex w-100 mb-2">
                <div className="col-3 h-6 d-flex align-items-center">
                  <span className="d-flex text-align-center">
                    <Icon symbol={COLUMNS_ICON_CONFIG[type]} className="mr-2" />
                  </span>
                  <span className="text-center">{name}</span>
                </div>
                <div className="col-9">
                  {Component && <Component record={record} column={column} />}
                </div>
              </li>
            );
          })}
        </ul>
      </ModalBody>
    </Modal>
  );
};

export default ExpandedPropertiesDialog;
