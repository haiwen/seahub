/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import toaster from '../../components/toast';
import Context from '../context';
import Store from '../store';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../constants';
import { Utils } from '../../utils/utils';
import { useMetadata } from './metadata';
import { useCollaborators } from './collaborators';
import { gettext } from '../../utils/constants';

const MetadataViewContext = React.createContext(null);

export const MetadataViewProvider = ({
  children,
  repoID,
  viewID,
  ...params
}) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ rows: [], columns: [], view: {} });
  const storeRef = useRef(null);
  const { collaborators } = useCollaborators();
  const { showFirstView, setShowFirstView } = useMetadata();

  const tableChanged = useCallback(() => {
    setMetadata(storeRef.current.data);
  }, []);

  const handleTableError = useCallback((error) => {
    toaster.danger(error.error);
  }, []);

  const updateMetadata = useCallback((data) => {
    setMetadata(data);
  }, []);

  const reloadMetadata = useCallback(() => {
    setLoading(true);
    storeRef.current.reload(PER_LOAD_NUMBER).then(() => {
      setMetadata(storeRef.current.data);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, []);

  const modifyFilters = useCallback((filters, filterConjunction, basicFilters) => {
    window.sfMetadataStore.modifyFilters(filterConjunction, filters, basicFilters);
  }, []);

  const modifySorts = useCallback((sorts, displaySorts = false) => {
    window.sfMetadataStore.modifySorts(sorts, displaySorts);
  }, []);

  const modifyGroupbys = useCallback((groupbys) => {
    window.sfMetadataStore.modifyGroupbys(groupbys);
  }, []);

  const modifyHiddenColumns = useCallback((hiddenColumns) => {
    window.sfMetadataStore.modifyHiddenColumns(hiddenColumns);
  }, []);

  const modifyColumnOrder = useCallback((sourceColumnKey, targetColumnKey) => {
    window.sfMetadataStore.modifyColumnOrder(sourceColumnKey, targetColumnKey);
  }, []);

  // init
  useEffect(() => {
    setLoading(true);
    // init context
    const context = new Context();
    window.sfMetadataContext = context;
    window.sfMetadataContext.init({ ...params, repoID, viewID });
    storeRef.current = new Store({ context: window.sfMetadataContext, repoId: repoID, viewId: viewID, collaborators });
    window.sfMetadataStore = storeRef.current;
    storeRef.current.initStartIndex();
    storeRef.current.load(PER_LOAD_NUMBER).then(() => {
      if (showFirstView && storeRef.current.data.rows.length === 0) {
        toaster.success(gettext('The files\' metadata is being created. This may take a minute or so. Please refresh the page later.'));
      }
      setMetadata(storeRef.current.data);
      setShowFirstView(false);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
    const eventBus = window.sfMetadataContext.eventBus;
    const unsubscribeServerTableChanged = eventBus.subscribe(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED, tableChanged);
    const unsubscribeTableChanged = eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED, tableChanged);
    const unsubscribeHandleTableError = eventBus.subscribe(EVENT_BUS_TYPE.TABLE_ERROR, handleTableError);
    const unsubscribeUpdateRows = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_TABLE_ROWS, updateMetadata);
    const unsubscribeReloadData = eventBus.subscribe(EVENT_BUS_TYPE.RELOAD_DATA, reloadMetadata);
    const unsubscribeModifyFilters = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_FILTERS, modifyFilters);
    const unsubscribeModifySorts = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_SORTS, modifySorts);
    const unsubscribeModifyGroupbys = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_GROUPBYS, modifyGroupbys);
    const unsubscribeModifyHiddenColumns = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, modifyHiddenColumns);
    const unsubscribeModifyColumnOrder = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER, modifyColumnOrder);

    return () => {
      window.sfMetadataContext.destroy();
      window.sfMetadataStore.destroy();
      unsubscribeServerTableChanged();
      unsubscribeTableChanged();
      unsubscribeHandleTableError();
      unsubscribeUpdateRows();
      unsubscribeReloadData();
      unsubscribeModifyFilters();
      unsubscribeModifySorts();
      unsubscribeModifyGroupbys();
      unsubscribeModifyHiddenColumns();
      unsubscribeModifyColumnOrder();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, viewID]);

  return (
    <MetadataViewContext.Provider
      value={{
        isLoading,
        metadata,
        store: storeRef.current,
        deleteFilesCallback: params.deleteFilesCallback,
        renameFileCallback: params.renameFileCallback,
      }}
    >
      {children}
    </MetadataViewContext.Provider>
  );
};

export const useMetadataView = () => {
  const context = useContext(MetadataViewContext);
  if (!context) {
    throw new Error('\'MetadataContext\' is null');
  }
  return context;
};
