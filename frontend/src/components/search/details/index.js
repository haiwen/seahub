import { useCallback, useEffect, useMemo, useState } from 'react';
import { Body, Header } from '../../dirent-detail/detail';
import { Utils } from '../../../utils/utils';
import Loading from '../../loading';
import DirDetails from './dir-details';
import FileDetails from './file-details';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../toast';
import { metadataAPI } from '../../../metadata';
import Column from '../../../metadata/model/column';
import { normalizeFields } from '../../../metadata/components/metadata-details/utils';
import { CellType, NOT_DISPLAY_COLUMN_KEYS } from '../../../metadata/components/metadata-details/constants';
import { getColumnByKey, getColumnOptions, getColumnOriginName } from '../../../metadata/utils/column';
import { getCellValueByColumn, getColumnOptionNameById, getColumnOptionNamesByIds, getRecordIdFromRecord, getServerOptions } from '../../../metadata/utils/cell';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import tagsAPI from '../../../tag/api';

import './index.css';
import { siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';

const SearchedItemDetails = ({ currentRepoID, repoID, repoInfo, path, dirent }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [direntDetail, setDirentDetail] = useState(null);
  const [metadataStatus, setMetadataStatus] = useState(null);
  const [record, setRecord] = useState(null);
  const [allColumns, setAllColumns] = useState([]);
  const [originColumns, setOriginColumns] = useState([]);

  const detailsSettings = useMemo(() => {
    if (!metadataStatus || !metadataStatus.details_settings) return null;
    return metadataStatus.details_settings;
  }, [metadataStatus]);
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
  const displayColumns = useMemo(() => columns.filter(c => c.shown), [columns]);

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
      if (repoID === currentRepoID) {
        const eventBus = window?.sfMetadataContext?.eventBus;
        if (eventBus) {
          eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_COLUMN_DATA_CHANGED, fieldKey, newColumn.data, oldColumn.data);
          eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId: record._id }, update);
        }
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [currentRepoID, repoID, record, originColumns]);

  const onChange = useCallback((fieldKey, newValue) => {
    const field = getColumnByKey(allColumns, fieldKey);
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
      if (repoID === currentRepoID && window?.sfMetadataContext?.eventBus) {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId }, update);
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED, recordId, update);
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [currentRepoID, repoID, record, allColumns]);

  const modifyLocalFileTags = useCallback((fileId, tagsIds) => {
    window.sfTagsDataStore && window.sfTagsDataStore.modifyLocalFileTags(fileId, tagsIds);
  }, []);

  const updateFileTags = useCallback((updateRecords) => {
    const { record_id, tags } = updateRecords[0];

    tagsAPI.updateFileTags(repoID, [{ record_id, tags }]).then(res => {
      const newValue = tags ? tags.map(id => ({ row_id: id, display_value: id })) : [];
      const update = { [PRIVATE_COLUMN_KEY.TAGS]: newValue };
      setRecord({ ...record, ...update });
      if (repoID === currentRepoID) {
        modifyLocalFileTags(record_id, tags);
        if (window?.sfMetadataContext?.eventBus) {
          window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId: record_id }, update);
        }
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [currentRepoID, repoID, record, modifyLocalFileTags]);

  useEffect(() => {
    if (!repoID || !repoInfo || !path || !dirent) return;
    setIsLoading(true);
    seafileAPI[dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo'](repoID, path).then(res => {
      setDirentDetail(res.data);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, repoInfo, path, dirent]);

  useEffect(() => {
    metadataAPI.getMetadataStatus(repoID).then(res => {
      const metadataStatus = res.data;
      setMetadataStatus(metadataStatus);

      if (!metadataStatus.enabled) {
        setIsLoading(false);
        return;
      }

      const parentDir = path.endsWith('/') ? Utils.getDirName(path.slice(0, -1)) : Utils.getDirName(path);
      metadataAPI.getRecord(repoID, { parentDir, fileName: dirent?.name }).then(res => {
        const { results, metadata } = res.data;
        const record = Array.isArray(results) && results.length > 0 ? results[0] : {};
        const allColumns = normalizeFields(metadata).map(field => new Column(field));
        const originColumns = allColumns.filter(c => !NOT_DISPLAY_COLUMN_KEYS.includes(c.key));
        setRecord(record);
        setAllColumns(allColumns);
        setOriginColumns(originColumns);
        setIsLoading(false);
      }).catch(error => {
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
        setIsLoading(false);
      });
    });
  }, [repoID, path, dirent]);

  let src = '';
  if (repoInfo.encrypted) {
    src = `${siteRoot}repo/${repoID}/raw` + Utils.encodePath(path);
  } else {
    src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}` + Utils.encodePath(path);
  }
  return (
    <div className="searched-item-details">
      <div
        className="cur-view-detail"
        style={{ width: 300 }}
      >
        <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)}></Header>
        <Body>
          {Utils.imageCheck(dirent.name) && (
            <div className="detail-image">
              <img src={src} alt="" />
            </div>
          )}
          {isLoading ? (
            <div className="detail-content"><Loading /></div>
          ) : (
            <div className="detail-content">
              {dirent.type !== 'file' ? (
                <DirDetails
                  repoInfo={repoInfo}
                  direntDetail={direntDetail}
                  enableMetadata={metadataStatus?.enabled}
                  record={record}
                  columns={columns}
                  displayColumns={displayColumns}
                  modifyColumnData={modifyColumnData}
                  onChange={onChange}
                  updateFileTags={updateFileTags}
                />
              ) : (
                <FileDetails
                  repoID={repoID}
                  repoInfo={repoInfo}
                  dirent={dirent}
                  direntDetail={direntDetail}
                  enableMetadata={metadataStatus?.enabled}
                  enableFaceRecognition={metadataStatus?.face_recognition_enabled}
                  record={record}
                  columns={columns}
                  displayColumns={displayColumns}
                  modifyColumnData={modifyColumnData}
                  onChange={onChange}
                  updateFileTags={updateFileTags}
                />
              )}
            </div>
          )}
        </Body>
      </div>
    </div>
  );
};

export default SearchedItemDetails;

