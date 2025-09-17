import React, { useCallback, useState, useRef, useEffect } from 'react';
import { withTranslation } from 'react-i18next';
import classnames from 'classnames';
import slugid from 'slugid';
import toaster from '../../../../../components/toast';
import context from '../../../context';
import { getErrorMsg } from '../../../utils/common-utils';
import { addDataToTree } from '../helpers';
import { gettext } from '../../../../../utils/constants';

import './index.css';

const LocalFiles = ({ onSelectedFile, toggle, fileType, searchContent, isOpenSearch }) => {
  const folderRef = useRef(null);

  const [expandedFolder, setExpandedFolder] = useState(new Set([]));
  const [currentActiveItem, setCurrentActiveItem] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [hasSearchResult, setHasSearchResult] = useState(false);
  const [isCurrentLibrary, setIsCurrentLibrary] = useState(false);

  const collapsedFolder = useCallback((data, indexId) => {
    for (let i = 0; i < data.length; i ++) {
      if (data[i].indexId === indexId) {
        data[i].children = null;
        break;
      }

      if (data[i]?.children) {
        collapsedFolder(data[i].children, indexId);
      }
    }
    setTreeData([...data]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTreeData = useCallback((p, indexId, treeData,) => {
    return context.getLocalFiles(p, fileType).then(res => {
      res.data.forEach((item) => {
        item.indexId = slugid.nice();
      });
      setHasSearchResult(false);
      setIsCurrentLibrary(true);
      // Open folder
      if (indexId && treeData.length > 0) {
        const newFileListData = addDataToTree(treeData, indexId, res.data, p);
        setTreeData([...newFileListData]);
        return;
      }
      // First loads
      res.data.forEach((item) => {
        item.path = `/${item.name}`;
      });
      setTreeData(res.data);
    }).catch(error => {
      toggle();
      const errorMessage = getErrorMsg(error);
      toaster.danger(errorMessage);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchContent.trim() && isOpenSearch) {
      getSearchFiles(searchContent, fileType);
    }

    if (!isOpenSearch || !searchContent.trim()) {
      const rootPath = '/';
      getTreeData(rootPath);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenSearch, searchContent, isOpenSearch]);

  const onToggle = useCallback(async (e, item, treeData) => {
    e.stopPropagation();
    if (expandedFolder.has(item.indexId)) {
      collapsedFolder(treeData, item.indexId);
      expandedFolder.delete(item.indexId);
    } else {
      await getTreeData(item.path, item.indexId, treeData);
      expandedFolder.add(item.indexId);
    }
    onSelectedFile(null);
    setCurrentActiveItem(item);
    setExpandedFolder(new Set(Array.from(expandedFolder)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedFolder]);

  const onSelectFile = useCallback((e, file) => {
    e.stopPropagation();
    setCurrentActiveItem(file);
    onSelectedFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSearchFiles = useCallback((searchContent, fileType) => {
    return context.getSearchFilesByFilename(searchContent, 1, 100, fileType).then(res => {
      res.data.results.forEach((item) => {
        item.indexId = slugid.nice();
        item.type = 'file';
        item.file_uuid = item.doc_uuid;
      });
      if (res.data.results.length === 0) {
        setHasSearchResult(false);
      } else {
        setHasSearchResult(true);
      }
      setIsCurrentLibrary(false);
      setTreeData(res.data.results);
    });
  }, []);

  const renderFileTree = useCallback((data) => {
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map((item) => {
      if (!item) return null;
      const { type, indexId, name } = item;
      // Get file type icon
      // const fileTypeIcon = parcelFileTypeIcon(name);
      const fileTypeIcon = false;

      const result = item.fullpath?.split('/').filter(Boolean);
      item.fullpath && result.pop();
      const folderPath = item.fullpath && result.join('/');
      const selected = currentActiveItem?.indexId === indexId;
      return (
        <div key={indexId} className={classnames('sdoc-folder-container', { 'sdoc-folder-search-results': hasSearchResult === true })}>
          {type === 'dir' && (
            <div ref={folderRef} className='sdoc-folder'>
              <div
                className={classnames('sdoc-folder-info sdoc-file-info', { 'active': selected, 'expanded': expandedFolder.has(indexId) })}
                onClick={(e) => onToggle(e, item, treeData)}
              >
                <div className='sdoc-file-icon-container'>
                  <i className='sdoc-file-icon sdoc-file-icon-toggle sdocfont sdoc-right-slide'></i>
                  <i className='sdoc-file-icon sdocfont sdoc-file sdoc-folder-icon'></i>
                </div>
                <span className='sdoc-folder-name sdoc-file-name'>{name}</span>
              </div>
              <div className='sdoc-folder-children'>
                {item.children?.length === 0 && (
                  <div className='sdoc-folder-children-empty'>
                    {`(${gettext('Empty')})`}
                  </div>
                )}
                {item.children?.length > 0 && (
                  renderFileTree(item.children)
                )}
              </div>
            </div>
          )}
          {['file', 'video', 'exdraw'].includes(type) && (
            <div className={classnames('sdoc-file-info', { 'active': selected })} onClick={(e) => {
              onSelectFile(e, item);
            }}>
              <div className='sdoc-file-icon-container'>
                <i className={classnames('sdoc-file-icon', { 'sdocfont sdoc-link-file': !fileTypeIcon })}></i>
                {fileTypeIcon && <img className='sdoc-file-img' src={fileTypeIcon} alt='' />}
              </div>
              <span className='sdoc-file-name'>{name}</span>
              {item.fullpath && folderPath.length !== 0 && (<span className='sdoc-search-folder-name'>{folderPath}</span>)}
            </div>
          )}
        </div>
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeData, currentActiveItem, expandedFolder]);

  return (
    <div className='sdoc-files-tree'>
      {renderFileTree(treeData)}
      {isOpenSearch && !hasSearchResult && !isCurrentLibrary && (
        <div className='sdoc-file-search-no-result'>{gettext('No_results')}</div>
      )}
    </div>
  );
};

export default withTranslation('sdoc-editor')(LocalFiles);
