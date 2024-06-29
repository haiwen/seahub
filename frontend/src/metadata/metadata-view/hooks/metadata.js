/* eslint-disable react/prop-types */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { toaster } from '@seafile/sf-metadata-ui-component';
import { Metadata } from '../model';
import { gettext } from '../../../utils/constants';
import { getErrorMsg, CellType } from '../_basic';
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
      case '_ctime':
        return gettext('Created time');
      case '_mtime':
        return gettext('Last modified time');
      case '_creator':
        return gettext('Creator');
      case '_last_modifier':
        return gettext('Last modifier');
      case '_file_creator':
        return gettext('File creator');
      case '_file_modifier':
        return gettext('File modifier');
      case '_file_ctime':
        return gettext('File created time');
      case '_file_mtime':
        return gettext('File last modified time');
      case '_is_dir':
        return gettext('Is dir');
      case '_parent_dir':
        return gettext('Parent dir');
      case '_name':
        return gettext('File name');
      default:
        return name;
    }
  }, []);

  const getColumnType = useCallback((key, type) => {
    switch (key) {
      case '_ctime':
      case '_file_ctime':
        return CellType.CTIME;
      case '_mtime':
      case '_file_mtime':
        return CellType.MTIME;
      case '_creator':
      case '_file_creator':
        return CellType.CREATOR;
      case '_last_modifier':
      case '_file_modifier':
        return CellType.LAST_MODIFIER;
      default:
        return type;
    }
  }, []);

  const getColumns = useCallback((columns) => {
    if (!Array.isArray(columns) || columns.length === 0) return [];
    return columns.map((column) => {
      const { type, key, name, ...params } = column;
      return {
        key,
        type: getColumnType(key, type),
        name: getColumnName(key, name),
        width: 200,
        ...params
      };
    }).filter(column => !['_id', '_ctime', '_mtime', '_creator', '_last_modifier'].includes(column.key));
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
