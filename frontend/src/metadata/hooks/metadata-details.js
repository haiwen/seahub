import React, { useContext, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { useMetadataStatus } from '../../hooks/metadata-status';
import { SYSTEM_FOLDERS } from '../../constants';
import Column from '../model/column';
import { normalizeFields } from '../components/metadata-details/utils';
import { CellType, EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY, UTC_FORMAT_DEFAULT } from '../constants';
import {
  getCellValueByColumn, getColumnOptionNamesByIds, getColumnOptionNameById, getRecordIdFromRecord,
  getServerOptions, getFileNameFromRecord, getParentDirFromRecord
} from '../utils/cell';
import tagsAPI from '../../tag/api';
import { getColumnByKey, getColumnOptions, getColumnOriginName } from '../utils/column';
import ObjectUtils from '../../utils/object';
import { NOT_DISPLAY_COLUMN_KEYS } from '../components/metadata-details/constants';

dayjs.extend(utc);

const MetadataDetailsContext = React.createContext(null);

export const MetadataDetailsProvider = ({ repoID, repoInfo, path, dirent, direntDetail, direntType, modifyLocalFileTags, onErrMessage, children }) => {
  const { enableMetadata, detailsSettings, modifyDetailsSettings } = useMetadataStatus();

  const [isLoading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [originColumns, setOriginColumns] = useState([]);

  const canModifyRecord = useMemo(() => repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? false : true, [repoInfo]);
  const canModifyDetails = useMemo(() => repoInfo.is_admin, [repoInfo]);

  const allColumnsRef = useRef([]);
  const direntRef = useRef(null);

  const columns = useMemo(() => {
    const orderAndHiddenColumns = detailsSettings?.columns || [];
    if (!Array.isArray(orderAndHiddenColumns) || orderAndHiddenColumns.length === 0) {
      return originColumns.map(c => ({ ...c, shown: true }));
    }
    const oldColumnsMap = orderAndHiddenColumns.reduce((pre, cur) => {
      pre[cur.key] = true;
      return pre;
    }, {});
    const columnsMap = originColumns.reduce((pre, cur) => {
      pre[cur.key] = cur;
      return pre;
    }, {});
    const exitColumnsOrder = orderAndHiddenColumns.map(c => {
      const column = columnsMap[c.key];
      if (column) return { ...c, ...column };
      return null;
    }).filter(c => c);
    const newColumns = originColumns.filter(c => !oldColumnsMap[c.key]).map(c => ({ ...c, shown: false }));
    return [...exitColumnsOrder, ...newColumns];
  }, [originColumns, detailsSettings]);

  const onLocalRecordChange = useCallback(({ recordId, parentDir, fileName }, updates) => {
    if (getRecordIdFromRecord(record) === recordId || (getParentDirFromRecord(record) === parentDir && getFileNameFromRecord(record) === fileName)) {
      const newRecord = {
        ...record,
        [PRIVATE_COLUMN_KEY.MTIME]: dayjs().utc().format(UTC_FORMAT_DEFAULT),
        [PRIVATE_COLUMN_KEY.LAST_MODIFIER]: window.sfMetadataContext.getUsername(),
        ...updates,
      };
      setRecord(newRecord);
    }
  }, [record]);

  const onChange = useCallback((fieldKey, newValue) => {
    const field = getColumnByKey(allColumnsRef.current, fieldKey);
    const columnName = getColumnOriginName(field);
    const recordId = getRecordIdFromRecord(record);
    let update = { [columnName]: newValue };
    if (field.type === CellType.SINGLE_SELECT) {
      update = { [columnName]: getColumnOptionNameById(field, newValue) };
    } else if (field.type === CellType.MULTIPLE_SELECT) {
      update = { [columnName]: newValue ? getColumnOptionNamesByIds(field, newValue) : [] };
    }
    metadataAPI.modifyRecord(repoID, { recordId }, update).then(res => {
      setRecord({ ...record, ...update });
      if (window?.sfMetadataContext?.eventBus) {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId }, update);
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED, { recordId }, update);
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, record, allColumnsRef]);

  const modifyColumnData = useCallback((fieldKey, newData) => {
    let newColumns = originColumns.slice(0);
    const oldColumn = getColumnByKey(originColumns, fieldKey);
    let newColumn = null;
    let update;
    if (oldColumn.type === CellType.SINGLE_SELECT) {
      newData.options = getServerOptions({ key: fieldKey, data: newData });
    }
    metadataAPI.modifyColumnData(repoID, fieldKey, newData).then(res => {
      newColumn = new Column(res.data.column);
      const fieldIndex = originColumns.findIndex(f => f.key === fieldKey);
      newColumns[fieldIndex] = newColumn;
      return newColumn;
    }).then((newField) => {
      const fileName = getColumnOriginName(newField);
      const options = getColumnOptions(newField);
      const newOption = options[options.length - 1];
      update = { [fileName]: newOption.id };
      if (newField.type === CellType.SINGLE_SELECT) {
        update = { [fileName]: getColumnOptionNameById(newField, newOption.id) };
      } else if (newField.type === CellType.MULTIPLE_SELECT) {
        const oldValue = getCellValueByColumn(record, newField) || [];
        update = { [fileName]: [...oldValue, newOption.name] };
      }
      return metadataAPI.modifyRecord(repoID, { recordId: record._id }, update);
    }).then(res => {
      setOriginColumns(newColumns);
      setRecord({ ...record, ...update });
      const eventBus = window?.sfMetadataContext?.eventBus;
      if (eventBus) {
        eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_COLUMN_DATA_CHANGED, fieldKey, newColumn.data, oldColumn.data);
        eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId: record._id }, update);
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, record, originColumns]);

  const updateFileTags = useCallback((updateRecords) => {
    const { record_id, tags } = updateRecords[0];

    tagsAPI.updateFileTags(repoID, [{ record_id, tags }]).then(res => {
      const newValue = tags ? tags.map(id => ({ row_id: id, display_value: id })) : [];
      const update = { [PRIVATE_COLUMN_KEY.TAGS]: newValue };
      setRecord({ ...record, ...update });
      modifyLocalFileTags && modifyLocalFileTags(record_id, tags);
      if (window?.sfMetadataContext?.eventBus) {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId: record_id }, update);
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, record, modifyLocalFileTags]);

  const updateDescription = useCallback((description) => {
    onChange(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION, description);
  }, [onChange]);

  const saveColumns = useCallback((columns) => {
    modifyDetailsSettings && modifyDetailsSettings({ columns: columns.map(c => ({ key: c.key, shown: c.shown })) });
  }, [modifyDetailsSettings]);

  const modifyHiddenColumns = useCallback((hiddenColumns) => {
    let newColumns = columns.slice(0);
    newColumns = newColumns.map(c => ({ ...c, shown: !hiddenColumns.includes(c.key) }));
    saveColumns(newColumns);
  }, [columns, saveColumns]);

  const modifyColumnOrder = useCallback((sourceColumnKey, targetColumnKey) => {
    const targetColumnIndex = columns.findIndex(c => c.key === targetColumnKey);
    const sourceColumn = columns.find(c => c.key === sourceColumnKey);
    let newColumns = columns.slice(0);
    newColumns = newColumns.filter(c => c.key !== sourceColumnKey);
    newColumns.splice(targetColumnIndex, 0, sourceColumn);
    saveColumns(newColumns);
  }, [columns, saveColumns]);

  useEffect(() => {
    if (!dirent || !direntDetail || !enableMetadata || SYSTEM_FOLDERS.find(folderPath => path.startsWith(folderPath))) {
      setLoading(true);
      direntRef.current = null;
      setRecord(null);
      setOriginColumns([]);
      setLoading(false);
      return;
    }
    if (ObjectUtils.isSameObject(direntRef.current, dirent, ['name'])) return;

    setLoading(true);
    direntRef.current = dirent;

    const fileName = dirent.name;
    let parentDir = path.split('/').pop() === fileName ? Utils.getDirName(path) : path;

    if (!parentDir.startsWith('/')) {
      parentDir = '/' + parentDir;
    }
    metadataAPI.getRecord(repoID, { parentDir, fileName }).then(res => {
      const { results, metadata } = res.data;
      const record = Array.isArray(results) && results.length > 0 ? results[0] : {};
      const allColumns = normalizeFields(metadata).map(field => new Column(field));
      allColumnsRef.current = allColumns;
      const columns = allColumns.filter(c => !NOT_DISPLAY_COLUMN_KEYS.includes(c.key));
      setRecord(record);
      setOriginColumns(columns);
      setLoading(false);
    }).catch(error => {
      if (error.response && error.response.status === 404 && onErrMessage) {
        const err = `${direntType === 'file' ? 'File' : 'Folder' } does not exist`;
        onErrMessage(err);
        setLoading(false);
        return;
      }
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableMetadata, repoID, path, direntType, dirent, direntDetail]);

  useEffect(() => {
    const eventBus = window?.sfMetadataContext?.eventBus;
    if (!eventBus) return;
    const unsubscribeLocalRecordChanged = eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED, onLocalRecordChange);
    return () => {
      unsubscribeLocalRecordChanged();
    };
  }, [onLocalRecordChange]);

  return (
    <MetadataDetailsContext.Provider
      value={{
        isLoading,
        canModifyRecord,
        canModifyDetails,
        record,
        columns,
        onChange,
        onLocalRecordChange,
        modifyColumnData,
        updateFileTags,
        modifyHiddenColumns,
        modifyColumnOrder,
        updateDescription,
      }}
    >
      {children}
    </MetadataDetailsContext.Provider>
  );
};

export const useMetadataDetails = () => {
  const context = useContext(MetadataDetailsContext);
  if (!context) {
    throw new Error('\'MetadataDetailsContext\' is null');
  }
  return context;
};
