import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../../components/toast';
import CellFormatter from '../cell-formatter';
import DetailEditor from '../detail-editor';
import DetailItem from '../../../components/dirent-detail/detail-item';
import { Utils } from '../../../utils/utils';
import metadataAPI from '../../api';
import Column from '../../model/metadata/column';
import { getCellValueByColumn, getOptionName, getColumnOptionNamesByIds } from '../../utils/cell';
import { normalizeFields } from './utils';
import { gettext } from '../../../utils/constants';
import { CellType, PREDEFINED_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../../constants';
import { getColumnOptions, getColumnOriginName } from '../../utils/column';
import { SYSTEM_FOLDERS } from './constants';

import './index.css';

const MetadataDetails = ({ repoID, filePath, repoInfo, direntType }) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ record: {}, fields: [] });
  const permission = useMemo(() => repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw', [repoInfo]);

  useEffect(() => {
    setLoading(true);
    if (SYSTEM_FOLDERS.find(folderPath => filePath.startsWith(folderPath))) {
      setLoading(false);
      return;
    }

    const dirName = Utils.getDirName(filePath);
    const fileName = Utils.getFileName(filePath);
    let parentDir = direntType === 'file' ? dirName : dirName.slice(0, dirName.length - fileName.length - 1);
    if (!parentDir.startsWith('/')) {
      parentDir = '/' + parentDir;
    }
    metadataAPI.getMetadataRecordInfo(repoID, parentDir, fileName).then(res => {
      const { results, metadata } = res.data;
      const record = Array.isArray(results) && results.length > 0 ? results[0] : {};
      let fields = normalizeFields(metadata).map(field => new Column(field));
      if (!Utils.imageCheck(fileName)) {
        fields = fields.filter(filed => filed.key !== PRIVATE_COLUMN_KEY.LOCATION);
      }
      setMetadata({ record, fields });
      setLoading(false);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      setLoading(false);
    });
  }, [repoID, filePath, direntType]);

  const onChange = useCallback((fieldKey, newValue) => {
    const { record, fields } = metadata;
    const field = fields.find(f => f.key === fieldKey);
    const fileName = getColumnOriginName(field);
    let update = { [fileName]: newValue };
    if (!PREDEFINED_COLUMN_KEYS.includes(field.key) && field.type === CellType.SINGLE_SELECT) {
      const options = getColumnOptions(field);
      update = { [fileName]: getOptionName(options, newValue) };
    } else if (field.type === CellType.MULTIPLE_SELECT) {
      update = { [fileName]: newValue ? getColumnOptionNamesByIds(field, newValue) : [] };
    }
    metadataAPI.modifyRecord(repoID, record._id, update, record._obj_id).then(res => {
      const newMetadata = { ...metadata, record: { ...record, ...update } };
      setMetadata(newMetadata);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, metadata]);

  const modifyColumnData = useCallback((fieldKey, newData) => {
    const { fields, record } = metadata;
    let newFields = fields.slice(0);
    let update;
    metadataAPI.modifyColumnData(repoID, fieldKey, newData).then(res => {
      const newField = new Column(res.data.column);
      const fieldIndex = fields.findIndex(f => f.key === fieldKey);
      newFields[fieldIndex] = newField;
      return newField;
    }).then((newField) => {
      const fileName = getColumnOriginName(newField);
      const options = getColumnOptions(newField);
      const newOption = options[options.length - 1];
      update = { [fileName]: newOption.id };
      if (!PREDEFINED_COLUMN_KEYS.includes(fieldKey) && newField.type === CellType.SINGLE_SELECT) {
        update = { [fileName]: getOptionName(options, newOption.id) };
      } else if (newField.type === CellType.MULTIPLE_SELECT) {
        const oldValue = getCellValueByColumn(record, newField) || [];
        update = { [fileName]: [...oldValue, newOption.name] };
      }
      return metadataAPI.modifyRecord(repoID, record._id, update, record._obj_id);
    }).then(res => {
      const newMetadata = { ...metadata, record: { ...record, ...update }, fields: newFields };
      setMetadata(newMetadata);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, metadata]);

  if (isLoading) return null;
  const { fields, record } = metadata;
  if (!record._id) return null;
  const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
  const isImage = record && (Utils.imageCheck(fileName) || Utils.videoCheck(fileName));
  return (
    <>
      {fields.map(field => {
        let canEdit = permission === 'rw' && field.editable;
        if (!isImage && canEdit && field.key === PRIVATE_COLUMN_KEY.SHOOTING_TIME) {
          canEdit = false;
        }
        const value = getCellValueByColumn(record, field);
        return (
          <DetailItem key={field.key} field={field} readonly={!canEdit}>
            {canEdit ? (
              <DetailEditor field={field} value={value} onChange={onChange} fields={fields} record={record} modifyColumnData={modifyColumnData} />
            ) : (
              <CellFormatter field={field} value={value} emptyTip={gettext('Empty')} className="sf-metadata-property-detail-formatter" />
            )}
          </DetailItem>
        );
      })}
    </>
  );
};

MetadataDetails.propTypes = {
  repoID: PropTypes.string,
  filePath: PropTypes.string,
  repoInfo: PropTypes.object,
  direntType: PropTypes.string,
  direntDetail: PropTypes.object,
};

export default MetadataDetails;
