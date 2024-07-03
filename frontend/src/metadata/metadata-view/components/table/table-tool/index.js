import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { FilterSetter, GroupbySetter, SortSetter, HideColumnSetter } from '../../data-process-setter';
import { Z_INDEX } from '../../../_basic';
import { EVENT_BUS_TYPE } from '../../../constants';
import { useCollaborators } from '../../../hooks';

import './index.css';

const TableTool = ({ searcherActive, view, columns, modifyFilters, modifySorts, modifyGroupbys, modifyHiddenColumns }) => {

  const { collaborators } = useCollaborators();

  const onHeaderClick = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, []);

  return (
    <div
      className={classnames('sf-metadata-tool', { 'searcher-active': searcherActive })}
      style={{ zIndex: Z_INDEX.TABLE_HEADER, transform: 'translateZ(1000px)' }}
      onClick={onHeaderClick}
    >
      <div className="sf-metadata-tool-left-operations">
        <FilterSetter
          wrapperClass="custom-tool-label custom-filter-label"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          filterConjunction={view.filter_conjunction}
          filters={view.filters}
          columns={columns}
          modifyFilters={modifyFilters}
          collaborators={collaborators}
        />
        <SortSetter
          wrapperClass="custom-tool-label custom-sort-label"
          target="sf-metadata-sort-popover"
          sorts={view.sorts}
          columns={columns}
          modifySorts={modifySorts}
        />
        <GroupbySetter
          wrapperClass={'custom-tool-label custom-groupby-label'}
          target={'sf-metadata-groupby-popover'}
          columns={[]}
          groupbys={[]}
          modifyGroupbys={modifyGroupbys}
        />
        <HideColumnSetter
          wrapperClass={'custom-tool-label custom-hide-column-label'}
          target={'sf-metadata-hide-column-popover'}
          columns={[]}
          modifyHiddenColumns={modifyHiddenColumns}
        />
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </div>
  );
};

TableTool.propTypes = {
  searcherActive: PropTypes.bool,
  view: PropTypes.object,
  columns: PropTypes.array,
  modifyFilters: PropTypes.func,
  modifySorts: PropTypes.func,
  modifyGroupbys: PropTypes.func,
  modifyHiddenColumns: PropTypes.func,
};

export default TableTool;
