import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../../constants';
import { FilterSetter, SortSetter } from '../../data-process-setter';
import { gettext } from '../../../../utils/constants';

const KanbanViewToolBar = ({
  isCustomPermission,
  readOnly,
  view,
  collaborators,
  modifyFilters,
  modifySorts,
  onToggleDetail,
}) => {
  const viewType = useMemo(() => view.type, [view]);
  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns;
  }, [view]);

  const filterColumns = useMemo(() => {
    return viewColumns.filter(c => c.key !== PRIVATE_COLUMN_KEY.FILE_TYPE);
  }, [viewColumns]);

  const onToggleKanbanSetting = () => {
    onToggleDetail();
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_KANBAN_SETTINGS);
  };

  const toggleDetails = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_KANBAN_SETTINGS);
    onToggleDetail();
  }, [onToggleDetail]);

  return (
    <>
      <div className="sf-metadata-tool-left-operations">
        <FilterSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-filter"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          readOnly={readOnly}
          filterConjunction={view.filter_conjunction}
          basicFilters={view.basic_filters}
          filters={view.filters}
          columns={filterColumns}
          modifyFilters={modifyFilters}
          collaborators={collaborators}
          viewType={viewType}
        />
        <SortSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
          target="sf-metadata-sort-popover"
          readOnly={readOnly}
          sorts={view.sorts}
          type={viewType}
          columns={viewColumns}
          modifySorts={modifySorts}
        />
        <IconBtn
          iconName="set-up"
          className="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-setting"
          size={24}
          role="button"
          aria-label={gettext('Settings')}
          title={gettext('Settings')}
          tabIndex={0}
          onClick={onToggleKanbanSetting}
        />
        {!isCustomPermission && (
          <div className="cur-view-path-btn ml-2" onClick={toggleDetails} aria-label={gettext('Properties')} title={gettext('Properties')}>
            <span className="sf3-font sf3-font-info"></span>
          </div>
        )}
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </>
  );
};

KanbanViewToolBar.propTypes = {
  readOnly: PropTypes.bool,
  view: PropTypes.object,
  collaborators: PropTypes.array,
  modifyFilters: PropTypes.func,
  modifySorts: PropTypes.func,
  onToggleDetail: PropTypes.func,
};

export default KanbanViewToolBar;
