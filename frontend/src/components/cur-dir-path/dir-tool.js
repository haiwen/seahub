import React from 'react';
import PropTypes from 'prop-types';
import TextTranslation from '../../utils/text-translation';
import ViewModes from '../../components/view-modes';
import SortMenu from '../../components/sort-menu';
import MetadataViewToolBar from '../../metadata/components/view-toolbar';
import TagsTableSearcher from '../../tag/views/all-tags/tags-table/tags-searcher';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { ALL_TAGS_ID } from '../../tag/constants';
import AllTagsSortSetter from '../../tag/views/all-tags/tags-table/sort-setter';
import TagFilesSortSetter from '../../tag/views/tag-files/sort-setter';

const propTypes = {
  userPerm: PropTypes.string,
  currentPath: PropTypes.string.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
  onDeleteRepoTag: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  isCustomPermission: PropTypes.bool,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func,
  viewId: PropTypes.string,
  onToggleDetail: PropTypes.func,
  onCloseDetail: PropTypes.func,
};

class DirTool extends React.Component {

  onSelectSortOption = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
    this.props.sortItems(sortBy, sortOrder);
  };

  render() {
    const { currentMode, currentPath, sortBy, sortOrder, viewId, isCustomPermission, onToggleDetail, onCloseDetail } = this.props;
    const propertiesText = TextTranslation.PROPERTIES.value;
    const isFileExtended = currentPath.startsWith('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/');
    const isTagView = currentPath.startsWith('/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/');
    const isAllTagsView = currentPath.split('/').pop() === ALL_TAGS_ID;

    if (isFileExtended) {
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

    if (isTagView) {
      return (
        <div className="dir-tool">
          {isAllTagsView && <TagsTableSearcher />}
          {isAllTagsView ? <AllTagsSortSetter /> : <TagFilesSortSetter />}
        </div>
      );
    }

    return (
      <div className="dir-tool d-flex">
        <ViewModes currentViewMode={currentMode} switchViewMode={this.props.switchViewMode} />
        <SortMenu sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption} />
        {(!isCustomPermission) &&
          <div className="cur-view-path-btn" onClick={onToggleDetail}>
            <span className="sf3-font sf3-font-info" aria-label={propertiesText} title={propertiesText}></span>
          </div>
        }
      </div>
    );
  }

}

DirTool.propTypes = propTypes;

export default DirTool;
