/* eslint-disable react/prop-types */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { toaster } from '@seafile/sf-metadata-ui-component';
import { Metadata } from '../model';
import { gettext } from '../../../utils/constants';
import { getErrorMsg } from '../_basic';
import { DEFAULT_COLUMNS } from '../constants';
import Context from '../context';

const MetadataContext = React.createContext(null);

export const MetadataProvider = ({
  children,
  ...params
}) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ records: [], columns: [] });

  // init
  useEffect(() => {
    const init = async () => {

      // init context
      const context = new Context();
      window.sfMetadataContext = context;
      await window.sfMetadataContext.init({ otherSettings: params });

      const repoID = window.sfMetadataContext.getSetting('repoID');
      window.sfMetadataContext.getMetadata(repoID).then(res => {
        const defaultColumns = DEFAULT_COLUMNS.map(item => {
          return {
            ...item,
            name: gettext(item.name)
          };
        });
        setMetadata(new Metadata({ rows: res?.data?.results || [], columns: res?.data?.columns || defaultColumns }));
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
