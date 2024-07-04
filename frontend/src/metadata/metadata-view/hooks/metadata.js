/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import toaster from '../../../components/toast';
import Context from '../context';
import Store from '../store';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../constants';
import { Utils } from '../../../utils/utils';

const MetadataContext = React.createContext(null);

export const MetadataProvider = ({
  children,
  ...params
}) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ rows: [], columns: [] });
  const storeRef = useRef(null);

  const tableChanged = useCallback(() => {
    setMetadata(storeRef.current.data);
  }, []);

  const handleTableError = useCallback((error) => {
    const errorMsg = Utils.getErrorMsg(error);
    toaster.danger(errorMsg);
  }, []);

  const updateMetadata = useCallback((data) => {
    setMetadata(data);
  }, []);

  // init
  useEffect(() => {
    // init context
    const context = new Context();
    window.sfMetadataContext = context;
    window.sfMetadataContext.init({ otherSettings: params });
    const repoId = window.sfMetadataContext.getSetting('repoID');
    storeRef.current = new Store({ context: window.sfMetadataContext, repoId });
    storeRef.current.initStartIndex();
    storeRef.current.loadData(PER_LOAD_NUMBER).then(() => {
      setMetadata(storeRef.current.data);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });

    const unsubscribeServerTableChanged = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED, tableChanged);
    const unsubscribeTableChanged = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED, tableChanged);
    const unsubscribeHandleTableError = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TABLE_ERROR, handleTableError);
    const unsubscribeUpdateRows = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_TABLE_ROWS, updateMetadata);

    return () => {
      window.sfMetadataContext.destroy();
      unsubscribeServerTableChanged();
      unsubscribeTableChanged();
      unsubscribeHandleTableError();
      unsubscribeUpdateRows();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MetadataContext.Provider value={{ isLoading, metadata, store: storeRef.current }}>
      {children}
    </MetadataContext.Provider>
  );
};

export const useMetadata = () => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('\'MetadataContext\' is null');
  }
  const { isLoading, metadata, store } = context;
  return { isLoading, metadata, store };
};
