import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FilterSetter, GroupbySetter, SortSetter, HideColumnSetter } from '../data-process-setter';
import { EVENT_BUS_TYPE } from '../../constants';

import './index.css';

const ViewToolBar = ({ metadataViewId }) => {
  const [view, setView] = useState(null);
  const [collaborators, setCollaborators] = useState([]);

  const availableColumns = useMemo(() => {
    if (!view) return [];
    return view.available_columns;
  }, [view]);

  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns;
  }, [view]);

  const onHeaderClick = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, []);

  const modifyFilters = useCallback((filters, filterConjunction) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_FILTERS, filters, filterConjunction);
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
  }, [metadataViewId]);

  if (!view) return null;

  const readOnly = !window.sfMetadataContext.canModifyView(view);

  return (
    <div
      className="sf-metadata-tool"
      onClick={onHeaderClick}
    >
      <div className="sf-metadata-tool-left-operations">
        <FilterSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-filter"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          readOnly={readOnly}
          filterConjunction={view.filter_conjunction}
          filters={view.filters}
          columns={availableColumns}
          modifyFilters={modifyFilters}
          collaborators={collaborators}
        />
        <SortSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
          target="sf-metadata-sort-popover"
          readOnly={readOnly}
          sorts={view.sorts}
          columns={viewColumns}
          modifySorts={modifySorts}
        />
        <GroupbySetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-groupby"
          target="sf-metadata-groupby-popover"
          readOnly={readOnly}
          columns={viewColumns}
          groupbys={view.groupbys}
          modifyGroupbys={modifyGroupbys}
        />
        <HideColumnSetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-hide-column"
          target="sf-metadata-hide-column-popover"
          readOnly={readOnly}
          columns={viewColumns.slice(1)}
          hiddenColumns={view.hidden_columns || []}
          modifyHiddenColumns={modifyHiddenColumns}
        />
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </div>
  );
};

ViewToolBar.propTypes = {
  metadataViewId: PropTypes.string,
};

export default ViewToolBar;
