import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import metadataAPI from '../api';
import Column from '../metadata-view/model/metadata/column';
import { normalizeFields, getCellValueByColumn } from './utils';
import DetailItem from '../../components/dirent-detail/detail-item';
import toaster from '../../components/toast';
import { gettext } from '../../utils/constants';
import { DetailEditor, CellFormatter } from '../metadata-view';
import { getColumnOriginName } from '../metadata-view/utils/column-utils';
import { CellType, getColumnOptions, getOptionName, PREDEFINED_COLUMN_KEYS, getColumnOptionNamesByIds } from '../metadata-view/_basic';

import './index.css';

const MetadataDetails = ({ repoID, filePath, repoInfo, direntType, emptyTip }) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ record: {}, fields: [] });
  const permission = useMemo(() => repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw', [repoInfo]);

  useEffect(() => {
    setLoading(true);
    const dirName = Utils.getDirName(filePath);
    const fileName = Utils.getFileName(filePath);
    let parentDir = direntType === 'file' ? dirName : dirName.slice(0, dirName.length - fileName.length - 1);
    if (!parentDir.startsWith('/')) {
      parentDir = '/' + parentDir;
    }
    metadataAPI.getMetadataRecordInfo(repoID, parentDir, fileName).then(res => {
      const { results, metadata } = res.data;
      const record = Array.isArray(results) && results.length > 0 ? results[0] : {};
      const fields = normalizeFields(metadata).map(field => new Column(field));
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
  return (
    <>
      {fields.map(field => {
        const canEdit = permission === 'rw' && field.editable;
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
