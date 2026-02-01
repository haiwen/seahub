import React from 'react';
import PropTypes from 'prop-types';
import TextTranslation from '../../utils/text-translation';
import ViewModes from '../../components/view-modes';
import SortMenu from '../../components/sort-menu';
import MetadataViewToolBar from '../../metadata/components/view-toolbar';
import HistoryViewToolbar from '../dir-view-mode/dir-history-view/history-view-toolbar';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { ALL_TAGS_ID } from '../../tag/constants';
import { HISTORY_MODE, LIST_MODE } from '../dir-view-mode/constants';
import TagsTableSearcher from '../../tag/views/all-tags/tags-table/tags-table-searcher';
import AllTagsSortSetter from '../../tag/views/all-tags/tags-table/all-tags-sort-setter';
import TagFilesViewToolbar from '../../tag/components/tag-files-view-toolbar';
import OpIcon from '../../components/op-icon';
import { HideColumnSetter } from '../../metadata/components/data-process-setter';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

const propTypes = {
  userPerm: PropTypes.string,
  currentPath: PropTypes.string.isRequired,
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  isCustomPermission: PropTypes.bool,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func,
  viewId: PropTypes.string,
  onToggleDetail: PropTypes.func,
  onCloseDetail: PropTypes.func,
  eventBus: PropTypes.object,
  enableMetadata: PropTypes.bool,
  columns: PropTypes.array,
  hiddenColumnKeys: PropTypes.array,
};

class DirTool extends React.Component {

  onSelectSortOption = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
    this.props.sortItems(sortBy, sortOrder);
  };

  modifyHiddenColumns = (hiddenColumns) => {
    this.props.eventBus.dispatch(EVENT_BUS_TYPE.HIDDEN_COLUMNS_CHANGED, hiddenColumns);
  };

  render() {
    const { currentMode, currentPath, sortBy, sortOrder, viewId, isCustomPermission, onToggleDetail, onCloseDetail } = this.props;

    const isMetadataView = currentPath.startsWith('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/');
    if (isMetadataView) {
      return (
        <div className="dir-tool">
          <MetadataViewToolBar
            viewId={viewId}
            isCustomPermission={isCustomPermission}
            onToggleDetail={onToggleDetail}
            onCloseDetail={onCloseDetail}
          />
        </div>
      );
    }

    const isTagView = currentPath.startsWith('/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/');
    if (isTagView) {
      const isAllTagsView = currentPath.split('/').pop() === ALL_TAGS_ID;
      return (
        <div className="dir-tool">
          {isAllTagsView ? <><TagsTableSearcher /><AllTagsSortSetter /></> : <TagFilesViewToolbar />}
        </div>
      );
    }

    const isHistoryView = currentMode === HISTORY_MODE;
    if (isHistoryView) {
      return (
        <div className="dir-tool">
          <HistoryViewToolbar />
        </div>
      );
    }

    const propertiesText = TextTranslation.PROPERTIES.value;
    return (
      <div className="dir-tool d-flex">
        <ViewModes currentViewMode={currentMode} switchViewMode={this.props.switchViewMode} />
        <SortMenu className="ml-2" sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption} />

        {this.props.enableMetadata && currentMode === LIST_MODE && (
          <HideColumnSetter
            wrapperClass="ml-2 cur-view-path-btn dir-tool-hide-column-setter"
            target="dir-hide-column-popover"
            readOnly={isCustomPermission}
            columns={this.props.columns}
            hiddenColumns={this.props.hiddenColumnKeys}
            modifyHiddenColumns={this.modifyHiddenColumns}
          />
        )}

        {(!isCustomPermission) &&
          <OpIcon
            className="cur-view-path-btn ml-2"
            symbol="info"
            title={propertiesText}
            op={onToggleDetail}
          />
        }
      </div>
    );
  }

}

DirTool.propTypes = propTypes;

export default DirTool;
