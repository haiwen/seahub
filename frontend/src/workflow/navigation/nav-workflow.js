import { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrag, useDrop, useDragLayer } from 'react-dnd';
import Icon from '../../components/icon';
import toaster from '../../components/toast';
import ItemDropdownMenu from '../../components/dropdown-menu/metadata-item-dropdown-menu';
import WorkflowNameEditor from '../components/name-editor';
import SaveWorkflowTipsDialog from '../components/save-workflow-tips-dialog';
import { useWorkflows } from '../hooks/workflows';
import { useWorkflow } from '../hooks/workflow';
import { TREE_NODE_CAN_DROP_CLASSNAME_MAP, TREE_NODE_MOVE_POSITION_MAP, WORKFLOW_DRAG_TYPE, WORKFLOW_NAV_TYPE_MAP } from '../constants/nav';
import { gettext } from '../../utils/constants';
import { isMobile } from '../../utils/utils';
import { EVENT_BUS_TYPE } from '../constants/event-bus-type';

const OPERATION_KEY = {
  RENAME: 'rename',
  DELETE: 'delete',
};

const NavWorkflow = ({ workflow, leftIndent = 0, folderId }) => {
  const { selectedWorkflowId, moveNav, modifySelectedWorkflow, workflowEventBus, canDragNav, modifyWorkflow } = useWorkflows();
  const { isChanged } = useWorkflow();
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isShowSaveTips, setIsShowSaveTips] = useState(false);

  const workflowId = useMemo(() => workflow.id, [workflow]);
  const workflowName = useMemo(() => workflow.name, [workflow]);
  const isSelected = useMemo(() => workflowId === selectedWorkflowId, [workflowId, selectedWorkflowId]);

  const treeNodeInnerRef = useRef(null);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: WORKFLOW_DRAG_TYPE,
    item: {
      data: {
        folder_id: folderId,
        workflow,
      },
      mode: WORKFLOW_NAV_TYPE_MAP.WORKFLOW,
    },
    end: (item, monitor) => {
      const sourceRow = monitor.getItem();
      const didDrop = monitor.didDrop();
      if (!didDrop) {
        return { sourceRow, targetRow: {} };
      }
    },
    canDrag: canDragNav && !freeze,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver, canDrop, draggedRow }, drop] = useDrop({
    accept: WORKFLOW_DRAG_TYPE,
    drop: (item) => {
      const { data, mode } = draggedRow;
      if (mode === WORKFLOW_NAV_TYPE_MAP.FOLDER && folderId) {
        // not allowed to move folder into folder
        return;
      }
      const target_workflow_id = workflowId;
      const target_folder_id = folderId;
      const treeNodeInnerClassName = (treeNodeInnerRef.current && treeNodeInnerRef.current.className) || '';
      if (treeNodeInnerClassName.includes(TREE_NODE_CAN_DROP_CLASSNAME_MAP.ABOVE)) {
        if (mode === WORKFLOW_NAV_TYPE_MAP.FOLDER) {
          const source_folder_id = data.folder.id;
          moveNav({
            source_folder_id,
            target_workflow_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.ABOVE,
          });
        }
        if (mode === WORKFLOW_NAV_TYPE_MAP.AUTOMATION_RULE) {
          const source_folder_id = data.folder_id;
          const source_workflow_id = data.workflow.id;
          if (source_workflow_id === target_workflow_id) return; // not changed
          moveNav({
            source_workflow_id,
            source_folder_id,
            target_workflow_id,
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
          moveNav({
            source_folder_id,
            target_workflow_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.BELOW,
          });
        }
        if (mode === WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
          const source_folder_id = data.folder_id;
          const source_workflow_id = data.workflow.id;
          moveNav({
            source_workflow_id,
            source_folder_id,
            target_workflow_id,
            target_folder_id,
            move_position: TREE_NODE_MOVE_POSITION_MAP.BELOW,
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
    if (
      !canDragNav || !isOver || !canDrop || !layerDragProps.clientOffset
      || (isDraggingFolder && folderId) // not allow to move folder into folder
    ) {
      return '';
    }
    const clientY = layerDragProps.clientOffset.y;
    const top = treeNodeInnerRef.current.getBoundingClientRect().y;
    const pointerPosition = clientY - top;
    if (pointerPosition < 16) {
      // above 1/2 of workflow tree node
      return TREE_NODE_CAN_DROP_CLASSNAME_MAP.ABOVE;
    }

    // behind 1/2 of workflow tree node
    return TREE_NODE_CAN_DROP_CLASSNAME_MAP.BELOW;
  }, [canDragNav, isOver, canDrop, layerDragProps, isDraggingFolder, folderId]);

  const operations = useMemo(() => {
    return [
      { key: OPERATION_KEY.RENAME, value: gettext('Rename workflow') },
      { key: OPERATION_KEY.DELETE, value: gettext('Delete workflow') },
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

  const onMenuItemClick = useCallback((operationKey) => {
    switch (operationKey) {
      case OPERATION_KEY.RENAME: {
        setIsEditingName(true);
        break;
      }
      case OPERATION_KEY.DELETE: {
        workflowEventBus.dispatch(EVENT_BUS_TYPE.SET_DELETE_WORKFLOW, workflow);
        break;
      }
      default: {
        break;
      }
    }
  }, [workflowEventBus, workflow]);

  const onSelectWorkflow = useCallback(() => {
    if (workflowId === selectedWorkflowId) return;
    if (isChanged) {
      setIsShowSaveTips(true);
      return;
    }
    modifySelectedWorkflow(workflowId);
  }, [workflowId, selectedWorkflowId, modifySelectedWorkflow, isChanged]);

  const closeNameEditor = useCallback(() => {
    setIsEditingName(false);
  }, []);

  const handleModifyName = useCallback((name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toaster.closeAll();
      toaster.danger(gettext('Name is required'));
      return;
    }
    if (trimmedName === workflowName) {
      closeNameEditor();
      return;
    }
    modifyWorkflow(
      workflowId,
      { name: trimmedName },
      { successCallback: closeNameEditor() }
    );
  }, [workflowId, workflowName, modifyWorkflow, closeNameEditor]);

  const leaveSaveTipsCallback = useCallback(() => {
    modifySelectedWorkflow(workflowId);
    setIsShowSaveTips(false);
  }, [modifySelectedWorkflow, workflowId]);

  return (
    <div className="workflow-nav-tree-node">
      <div
        className={classnames('workflow-nav-tree-node-inner', dropTipsClassName, { selected: isSelected, '--dragging': isDragging })}
        onClick={onSelectWorkflow}
        ref={node => {
          treeNodeInnerRef.current = node;
          drop(node);
        }}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        <div
          className={classnames('workflow-nav-tree-node-main', { 'tree-node-inner-hover': false, 'tree-node-hight-light': false })}
          ref={drag}
        >
          {isSelected && <div className="active-indicator"></div>}
          <div className="workflow-nav-tree-node-content" style={{ paddingLeft: leftIndent || 0 }} ref={dragPreview}>
            <Icon symbol="workflow" />
            {isEditingName && (
              <div className="workflow-nav-tree-node-name-editor-wrapper">
                <WorkflowNameEditor
                  initialName={workflowName}
                  onCancel={closeNameEditor}
                  saveName={handleModifyName}
                />
              </div>
            )}
            {!isEditingName && (
              <div className="workflow-nav-tree-node-name-wrapper text-truncate">
                <span className="workflow-nav-tree-node-text text-truncate" title={''}>{workflowName}</span>
              </div>
            )}
          </div>
        </div>
        {!isEditingName && (
          <div className="workflow-nav-tree-node-operations d-flex" aria-hidden="true">
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
          </div>
        )}
      </div>
      {isShowSaveTips && (
        <SaveWorkflowTipsDialog
          saveCallback={() => modifySelectedWorkflow(workflowId)}
          leaveCallback={leaveSaveTipsCallback}
          toggle={() => setIsShowSaveTips(false)}
        />
      )}
    </div>
  );
};

NavWorkflow.propTypes = {
  workflow: PropTypes.object,
  leftIndent: PropTypes.number,
  folderId: PropTypes.string,
};


export default NavWorkflow;
