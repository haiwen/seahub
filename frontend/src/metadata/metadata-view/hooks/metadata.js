/* eslint-disable react/prop-types */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { toaster } from '@seafile/sf-metadata-ui-component';
import { Metadata } from '../model';
import { gettext } from '../../../utils/constants';
import { getErrorMsg, CellType, PRIVATE_COLUMN_KEY, NOT_DISPLAY_COLUMN_KEYS } from '../_basic';
import Context from '../context';

const MetadataContext = React.createContext(null);

export const MetadataProvider = ({
  children,
  ...params
}) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ records: [], columns: [] });

  const getColumnName = useCallback((key, name) => {
    switch (key) {
      case PRIVATE_COLUMN_KEY.CTIME:
        return gettext('Created time');
      case PRIVATE_COLUMN_KEY.MTIME:
        return gettext('Last modified time');
      case PRIVATE_COLUMN_KEY.CREATOR:
        return gettext('Creator');
      case PRIVATE_COLUMN_KEY.LAST_MODIFIER:
        return gettext('Last modifier');
      case PRIVATE_COLUMN_KEY.FILE_CREATOR:
        return gettext('File creator');
      case PRIVATE_COLUMN_KEY.FILE_MODIFIER:
        return gettext('File modifier');
      case PRIVATE_COLUMN_KEY.FILE_CTIME:
        return gettext('File created time');
      case PRIVATE_COLUMN_KEY.FILE_MTIME:
        return gettext('File last modified time');
      case PRIVATE_COLUMN_KEY.IS_DIR:
        return gettext('Is dir');
      case PRIVATE_COLUMN_KEY.PARENT_DIR:
        return gettext('Parent dir');
      case PRIVATE_COLUMN_KEY.FILE_NAME:
        return gettext('File name');
      default:
        return name;
    }
  }, []);

  const getColumnType = useCallback((key, type) => {
    switch (key) {
      case PRIVATE_COLUMN_KEY.CTIME:
      case PRIVATE_COLUMN_KEY.FILE_CTIME:
        return CellType.CTIME;
      case PRIVATE_COLUMN_KEY.MTIME:
      case PRIVATE_COLUMN_KEY.FILE_MTIME:
        return CellType.MTIME;
      case PRIVATE_COLUMN_KEY.CREATOR:
      case PRIVATE_COLUMN_KEY.FILE_CREATOR:
        return CellType.CREATOR;
      case PRIVATE_COLUMN_KEY.LAST_MODIFIER:
      case PRIVATE_COLUMN_KEY.FILE_MODIFIER:
        return CellType.LAST_MODIFIER;
      case PRIVATE_COLUMN_KEY.FILE_NAME:
        return CellType.FILE_NAME;
      default:
        return type;
    }
  }, []);

  const getColumns = useCallback((columns) => {
    if (!Array.isArray(columns) || columns.length === 0) return [];
    const validColumns = columns.map((column) => {
      const { type, key, name, ...params } = column;
      return {
        key,
        type: getColumnType(key, type),
        name: getColumnName(key, name),
        ...params,
        width: 200,
      };
    }).filter(column => !NOT_DISPLAY_COLUMN_KEYS.includes(column.key));
    let displayColumns = [];
    validColumns.forEach(column => {
      if (column.key === '_name') {
        displayColumns.unshift(column);
      } else if (column.key === PRIVATE_COLUMN_KEY.PARENT_DIR) {
        const nameColumnIndex = displayColumns.findIndex(column => column.key === PRIVATE_COLUMN_KEY.PARENT_DIR);
        if (nameColumnIndex === -1) {
          displayColumns.unshift(column);
        } else {
          displayColumns.splice(nameColumnIndex, 0, column);
        }
      } else {
        displayColumns.push(column);
      }
    });
    return displayColumns;
  }, [getColumnType, getColumnName]);

  // init
  useEffect(() => {
    const init = async () => {

      // init context
      const context = new Context();
      window.sfMetadataContext = context;
      await window.sfMetadataContext.init({ otherSettings: params });

      const repoID = window.sfMetadataContext.getSetting('repoID');
      window.sfMetadataContext.getMetadata(repoID).then(res => {
        setMetadata(new Metadata({ rows: res?.data?.results || [], columns: getColumns(res?.data?.metadata) }));
        setLoading(false);
      }).catch(error => {
        const errorMsg = getErrorMsg(error);
        toaster.danger(gettext(errorMsg));
      });
    };

    init();

    return () => {
      window.sfMetadataContext.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extendMetadataRows = useCallback((callback) => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    window.sfMetadataContext.getMetadata(repoID).then(res => {
      const rows = res?.data?.results || [];
      metadata.extendRows(rows);
      setMetadata(metadata);
      callback && callback(true);
    }).catch(error => {
      const errorMsg = getErrorMsg(error);
      toaster.danger(gettext(errorMsg));
      callback && callback(false);
    });

  }, [metadata]);

  return (
    <MetadataContext.Provider value={{ isLoading, metadata, extendMetadataRows }}>
      {children}
    </MetadataContext.Provider>
  );
};

export const useMetadata = () => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('\'MetadataContext\' is null');
  }
  const { isLoading, metadata, extendMetadataRows } = context;
  return { isLoading, metadata, extendMetadataRows };
};
