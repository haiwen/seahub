import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { EVENT_BUS_TYPE } from '@/metadata/constants';
import TableViewToolbar from '@/metadata/components/view-toolbar/table-view-toolbar';


const ViewToolBar = ({ viewId }) => {
  const [view, setView] = useState(null);
  const [collaborators, setCollaborators] = useState([]);

  const onHeaderClick = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, []);

  const modifyFilters = useCallback((filters, filterConjunction, basicFilters) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_FILTERS, filters, filterConjunction, basicFilters);
  }, []);

  const modifySorts = useCallback((sorts) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_SORTS, sorts);
  }, []);

  const modifyGroupbys = useCallback((groupbys) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GROUPBYS, groupbys);
  }, []);

  const modifyHiddenColumns = useCallback((hiddenColumns) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, hiddenColumns);
  }, []);

  const modifyColumnOrder = useCallback((sourceColumnKey, targetColumnKey) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER, sourceColumnKey, targetColumnKey);
  }, []);

  const viewChange = useCallback((view) => {
    setView(view);
  }, []);

  useEffect(() => {
    let unsubscribeViewChange;
    let timer = setInterval(() => {
      if (window.sfMetadataContext && window.sfMetadataStore.data) {
        timer && clearInterval(timer);
        timer = null;
        setView(window.sfMetadataStore.data.view);
        setCollaborators(window.sfMetadataStore?.collaborators || []);
        unsubscribeViewChange = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.VIEW_CHANGED, viewChange);
      }
    }, 300);
    return () => {
      timer && clearInterval(timer);
      unsubscribeViewChange && unsubscribeViewChange();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  if (!view) return null;

  const readOnly = window.sfMetadataContext ? !window.sfMetadataContext.canModifyView(view) : true;

  return (
    <div
      className="sf-metadata-tool"
      onClick={onHeaderClick}
    >
      <TableViewToolbar
        readOnly={readOnly}
        view={view}
        collaborators={collaborators}
        modifyFilters={modifyFilters}
        modifySorts={modifySorts}
        modifyGroupbys={modifyGroupbys}
        modifyHiddenColumns={modifyHiddenColumns}
        modifyColumnOrder={modifyColumnOrder}
      />
    </div>
  );
};

ViewToolBar.propTypes = {
  viewId: PropTypes.string,
  isCustomPermission: PropTypes.bool,
  onToggleDetail: PropTypes.func,
  onCloseDetail: PropTypes.func,
};

export default ViewToolBar;
