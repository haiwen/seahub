import { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrag, useDrop, useDragLayer } from 'react-dnd';
import toaster from '../../components/toast';
import ItemDropdownMenu from '../../components/dropdown-menu/metadata-item-dropdown-menu';
import NavWorkflow from './nav-workflow';
import WorkflowNameEditor from '../components/name-editor';
import NewWorkflowEditor from './new-workflow-editor';
import WorkflowDeleteTip from '../components/delete-tip';
import SaveWorkflowTipsDialog from '../components/save-workflow-tips-dialog';
import { useWorkflows } from '../hooks/workflows';
import { useWorkflow } from '../hooks/workflow';
import { TREE_NODE_CAN_DROP_CLASSNAME_MAP, TREE_NODE_MOVE_POSITION_MAP, WORKFLOW_DRAG_TYPE, WORKFLOW_NAV_LEFT_INDENT, WORKFLOW_NAV_TYPE_MAP } from '../constants/nav';
import { gettext } from '../../utils/constants';
import { isMobile } from '../../utils/utils';

const OPERATION_KEY = {
  ADD_WORKFLOW: 'add_workflow',
  RENAME: 'rename',
  DELETE: 'delete',
};

const WorkflowNavFolder = ({ folder, leftIndent = 0, getWorkflowById }) => {
  const { canDragNav, moveNav, addNewWorkflow, deleteFolder, modifyFolder } = useWorkflows();
  const { isChanged } = useWorkflow();
  const [isExpand, setIsExpand] = useState(true);
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isShowNewWorkflowEditor, setIsShowNewWorkflowEditor] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isShowDeleteFolderTips, setIsShowDeleteFolderTips] = useState(false);
  const [isShowSaveTips, setIsShowSaveTips] = useState(false);

  const treeNodeInnerRef = useRef(null);
  const operationsRef = useRef(null);
  const deleteFolderTipsPositionRef = useRef(null);

  const folderId = useMemo(() => folder.id, [folder]);
  const folderName = useMemo(() => folder.name || '', [folder]);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: WORKFLOW_DRAG_TYPE,
    item: {
      data: { folder },
      mode: WORKFLOW_NAV_TYPE_MAP.FOLDER,
    },
    end: (item, monitor) => {
      const sourceRow = monitor.getItem();
      const didDrop = monitor.didDrop();
      if (!didDrop) {
        return { sourceRow, targetRow: {} };
      }
    },
    canDrag: canDragNav,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver, canDrop, draggedRow }, drop] = useDrop({
    accept: WORKFLOW_DRAG_TYPE,
    drop: (item) => {
      const { data, mode } = draggedRow;
      const treeNodeInnerClassName = (treeNodeInnerRef.current && treeNodeInnerRef.current.className) || '';
      const target_folder_id = folderId;
      if (treeNodeInnerClassName.includes(TREE_NODE_CAN_DROP_CLASSNAME_MAP.ABOVE)) {
        if (mode === WORKFLOW_NAV_TYPE_MAP.FOLDER) {
          const source_folder_id = data.folder.id;
          if (source_folder_id === target_folder_id) return;
          moveNav({
            source_folder_id,
            target_folder_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.ABOVE,
          });
          return;
        }
        if (mode === WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
          const source_folder_id = data.folder_id;
          const source_workflow_id = data.workflow.id;
          moveNav({
            source_workflow_id,
            source_folder_id,
            target_folder_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.ABOVE,
          });
          return;
        }
        return;
      }
      if (treeNodeInnerClassName.includes(TREE_NODE_CAN_DROP_CLASSNAME_MAP.BELOW)) {
        if (mode === WORKFLOW_NAV_TYPE_MAP.FOLDER) {
          const source_folder_id = data.folder.id;
          if (source_folder_id === target_folder_id) return;
          moveNav({
            source_folder_id,
            target_folder_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.BELOW,
          });
          return;
        }
        if (mode === WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
          const source_folder_id = data.folder_id;
          const source_workflow_id = data.workflow.id;
          moveNav({
            source_workflow_id,
            source_folder_id,
            target_folder_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.BELOW,
          });
          return;
        }
        return;
      }
      if (treeNodeInnerClassName.includes(TREE_NODE_CAN_DROP_CLASSNAME_MAP.INSIDE)) {
        if (mode === WORKFLOW_NAV_TYPE_MAP.FOLDER) return; // not allowed to move folder into folder
        if (mode === WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
          const source_folder_id = data.folder_id;
          const source_workflow_id = data.workflow.id;
          moveNav({
            source_workflow_id,
            source_folder_id,
            target_folder_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.INSIDE,
          });
          return;
        }
        return;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      draggedRow: monitor.getItem(),
    }),
  });

  const layerDragProps = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    clientOffset: monitor.getClientOffset(),
  }));

  const isDraggingFolder = useMemo(() => {
    const { mode } = layerDragProps.item || {};
    return mode === WORKFLOW_NAV_TYPE_MAP.FOLDER;
  }, [layerDragProps]);


  const dropTipsClassName = useMemo(() => {
    if (!canDragNav || !isOver || !canDrop || !layerDragProps.clientOffset) {
      return '';
    }
    const clientY = layerDragProps.clientOffset.y;
    const top = treeNodeInnerRef.current.getBoundingClientRect().y;
    const pointerPosition = clientY - top;
    if (pointerPosition < 6) {
      // above of folder tree node
      return TREE_NODE_CAN_DROP_CLASSNAME_MAP.ABOVE;
    }

    if (pointerPosition > 26) {
      return TREE_NODE_CAN_DROP_CLASSNAME_MAP.BELOW;
    }

    // behind of folder tree node
    if (isDraggingFolder) {
      // not allowed to move folder into folder
      return '';
    }
    return TREE_NODE_CAN_DROP_CLASSNAME_MAP.INSIDE;
  }, [canDragNav, isOver, canDrop, layerDragProps, isDraggingFolder]);

  const operations = useMemo(() => {
    return [
      { key: OPERATION_KEY.ADD_WORKFLOW, value: gettext('Add workflow') },
      { key: OPERATION_KEY.RENAME, value: gettext('Rename') },
      { key: OPERATION_KEY.DELETE, value: gettext('Delete') },
    ];
  }, []);

  const onMouseEnter = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseOver = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseLeave = useCallback(() => {
    if (freeze) return;
    setHighlight(false);
  }, [freeze]);

  const freezeItem = useCallback(() => {
    setFreeze(true);
    setHighlight(true);
  }, []);

  const unfreezeItem = useCallback(() => {
    setFreeze(false);
    setHighlight(false);
  }, []);

  const handleModifyName = useCallback((name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toaster.closeAll();
      toaster.danger(gettext('Name is required'));
      return;
    }
    if (trimmedName === folderName) {
      setIsEditingName(false);
      return;
    }
    modifyFolder(folderId, { name: trimmedName }, () => {
      setIsEditingName(false);
    });
  }, [folderId, folderName, modifyFolder]);

  const closeNameEditor = useCallback(() => {
    setIsEditingName(false);
  }, []);

  const showDeleteFolderTips = useCallback((event) => {
    if (!operationsRef.current) return;
    const { top, left, width } = operationsRef.current.getBoundingClientRect();
    deleteFolderTipsPositionRef.current = {
      top,
      left: left + width,
    };
    setIsShowDeleteFolderTips(true);
  }, []);

  const closeDeleteFolderEditor = useCallback(() => {
    setIsShowDeleteFolderTips(false);
    deleteFolderTipsPositionRef.current = null;
  }, []);

  const closeNewWorkflowEditor = useCallback(() => {
    setIsShowNewWorkflowEditor(false);
  }, []);

  const handleAddNewWorkflow = useCallback((name) => {
    addNewWorkflow({ name }, {
      folderId,
      successCallback: () => {
        closeNewWorkflowEditor();
      }
    });
  }, [folderId, addNewWorkflow, closeNewWorkflowEditor]);

  const handleDeleteFolder = useCallback(() => {
    deleteFolder(folderId);
  }, [folderId, deleteFolder]);

  const onMenuItemClick = useCallback((operationKey) => {
    switch (operationKey) {
      case OPERATION_KEY.ADD_WORKFLOW: {
        if (isChanged) {
          setIsShowSaveTips(true);
          return;
        }
        setIsShowNewWorkflowEditor(true);
        break;
      }
      case OPERATION_KEY.RENAME: {
        setIsEditingName(true);
        break;
      }
      case OPERATION_KEY.DELETE: {
        showDeleteFolderTips();
        break;
      }
      default: {
        break;
      }
    }
  }, [showDeleteFolderTips, isChanged]);

  const leaveSaveTipsCallback = useCallback(() => {
    setIsShowNewWorkflowEditor(true);
    setIsShowSaveTips(false);
  }, []);

  return (
    <div className="workflow-nav-tree-node">
      <div
        className={classnames('workflow-nav-tree-node-inner', dropTipsClassName, { '--dragging': isDragging })}
        onClick={() => setIsExpand(!isExpand)}
        ref={node => {
          treeNodeInnerRef.current = node;
          dragPreview(node);
          drop(node);
        }}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        <div className="workflow-nav-tree-node-main">
          <div className="workflow-nav-tree-node-content" ref={drag}>
            <span className="workflow-nav-tree-node-icon-down-wrapper"><i className={classnames('folder-toggle-icon sf3-font sf3-font-down workflow-nav-tree-node-icon', { 'rotate-270': !isExpand })} aria-hidden="true"></i></span>
            <i className="sf3-font sf3-font-folder workflow-nav-tree-node-icon" aria-hidden="true"></i>
            {isEditingName && (
              <div className="workflow-nav-tree-node-name-editor-wrapper">
                <WorkflowNameEditor
                  initialName={folderName}
                  onCancel={closeNameEditor}
                  saveName={handleModifyName}
                />
              </div>
            )}
            {!isEditingName && (
              <div className="workflow-nav-tree-node-name-wrapper text-truncate">
                <span className="workflow-nav-tree-node-text text-truncate" title={folderName}>{folderName}</span>
              </div>
            )}
          </div>
        </div>
        {!isEditingName && (
          <div className="d-flex workflow-nav-tree-node-operations" aria-hidden="true" ref={operationsRef}>
            <div className='workflow-nav-tree-node-operation-wrapper'>
              {highlight && (
                <ItemDropdownMenu
                  item={{ name: 'workflow' }}
                  menuClassname="workflow-dropdown-menu"
                  toggleClass="sf3-font sf3-font-more"
                  freezeItem={freezeItem}
                  unfreezeItem={unfreezeItem}
                  getMenuList={() => operations}
                  onMenuItemClick={onMenuItemClick}
                  menuStyle={isMobile ? { zIndex: 1050 } : {}}
                />
              )}
            </div>
            {(isShowDeleteFolderTips && deleteFolderTipsPositionRef.current) && (
              <WorkflowDeleteTip
                offsets={{ width: 280 }}
                position={deleteFolderTipsPositionRef.current}
                toggle={closeDeleteFolderEditor}
                onDelete={handleDeleteFolder}
                deleteTip={gettext('Are you sure you want to delete this folder and the workflows within it?')}
              />
            )}
          </div>
        )}
      </div>
      <div className="workflow-nav-tree-node-children">
        {(isExpand && Array.isArray(folder.children)) && folder.children.map((childNav) => {
          const { id: navId, type: navType } = childNav || {};
          if (navType === WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
            const workflow = getWorkflowById(navId);
            if (!workflow) return null;
            return (
              <NavWorkflow
                key={`workflow-nav-${navId}`}
                workflow={workflow}
                folderId={folderId}
                leftIndent={leftIndent + WORKFLOW_NAV_LEFT_INDENT}
                moveNav={moveNav}
              />
            );
          }
          return null;
        })}
        {isShowNewWorkflowEditor && (
          <NewWorkflowEditor
            key="workflow-nav-new-workflow-editor"
            leftIndent={leftIndent + WORKFLOW_NAV_LEFT_INDENT}
            addNewWorkflow={handleAddNewWorkflow}
            cancelAddNewWorkflow={closeNewWorkflowEditor}
          />
        )}
      </div>
      {isShowSaveTips && (
        <SaveWorkflowTipsDialog
          saveCallback={() => setIsShowNewWorkflowEditor(true)}
          leaveCallback={leaveSaveTipsCallback}
          toggle={() => setIsShowSaveTips(false)}
        />
      )}
    </div>
  );
};

WorkflowNavFolder.propTypes = {
  folder: PropTypes.object,
  leftIndent: PropTypes.number,
  getWorkflowById: PropTypes.func,
};

export default WorkflowNavFolder;
