import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Loading from '../components/loading';
import ResizeBar from '../components/resize-bar';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import DeleteWorkflowDialog from './components/delete-workflow-dialog';
import { WorkflowProvider } from './hooks/workflow';
import { useWorkflows } from './hooks/workflows';
import { Utils } from '../utils/utils';
import { normalizeSidePanelRate } from './utils/panel';
import { DRAG_HANDLER_HEIGHT } from '../components/resize-bar/constants';
import { EVENT_BUS_TYPE } from './constants/event-bus-type';

import './index.css';

const SIDE_PANEL_RATE_STORE_KEY = 'sf_workflow_side_panel_rate';
const SIDE_PANEL_FOLDED_STORE_KEY = 'sf_workflow_side_panel_folded';

const Workflow = () => {
  const { isLoading, workflowEventBus, deleteWorkflow } = useWorkflows();
  const [isSidePanelFolded, setIsSidePanelFolded] = useState(localStorage.getItem(SIDE_PANEL_FOLDED_STORE_KEY) === 'true');
  const [waitDeleteWorkflow, setWaitDeleteWorkflow] = useState(null);

  const sidePanelDOMRef = useRef(null);
  const mainPanelDOMRef = useRef(null);
  const resizeBarRef = useRef(null);
  const dragHandlerRef = useRef(null);

  const setDragHandlerTop = (top) => {
    dragHandlerRef.current.style.top = top + 'px';
  };

  const modifyLayoutWithSidebarRate = useCallback((rate) => {
    sidePanelDOMRef.current && (sidePanelDOMRef.current.style.flex = `0 0 ${rate}%`);
    mainPanelDOMRef.current && (mainPanelDOMRef.current.style.flex = `0 0 ${100 - rate}%`);
    resizeBarRef.current && (resizeBarRef.current.style.left = `calc(${rate}% - 1px)`);
  }, []);

  const onResizeMouseMove = useCallback((e) => {
    const rate = normalizeSidePanelRate(parseFloat((e.clientX / window.innerWidth * 100).toFixed(4)));
    modifyLayoutWithSidebarRate(rate);
    localStorage.setItem(SIDE_PANEL_RATE_STORE_KEY, rate);
  }, [modifyLayoutWithSidebarRate]);

  const onResizeMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', onResizeMouseMove);
    window.removeEventListener('mouseup', onResizeMouseUp);
  }, [onResizeMouseMove]);

  const onResizeMouseDown = useCallback(() => {
    window.addEventListener('mouseup', onResizeMouseUp);
    window.addEventListener('mousemove', onResizeMouseMove);
  }, [onResizeMouseUp, onResizeMouseMove]);


  const onResizeMouseOver = useCallback((event) => {
    if (!resizeBarRef.current || !dragHandlerRef.current) return;
    const { top } = resizeBarRef.current.getBoundingClientRect();
    const dragHandlerRefTop = event.pageY - top - DRAG_HANDLER_HEIGHT / 2;
    setDragHandlerTop(dragHandlerRefTop < 0 ? 0 : dragHandlerRefTop);
  }, []);

  const onToggleSidePanelFolded = useCallback(() => {
    const folded = !isSidePanelFolded;
    localStorage.setItem(SIDE_PANEL_FOLDED_STORE_KEY, folded);
    setIsSidePanelFolded(folded);
  }, [isSidePanelFolded]);

  const clearWaitDeleteWorkflow = useCallback(() => {
    setWaitDeleteWorkflow(null);
  }, []);

  const handleDeleteWorkflow = useCallback(() => {
    if (waitDeleteWorkflow) {
      deleteWorkflow(waitDeleteWorkflow.id);
    }
    clearWaitDeleteWorkflow();
  }, [waitDeleteWorkflow, clearWaitDeleteWorkflow, deleteWorkflow]);

  const cancelDeleteWorkflow = useCallback(() => {
    clearWaitDeleteWorkflow();
  }, [clearWaitDeleteWorkflow]);

  useEffect(() => {
    if (!isLoading) {
      const initSidePanelRate = isSidePanelFolded ? 0 : normalizeSidePanelRate(parseFloat(localStorage.getItem(SIDE_PANEL_RATE_STORE_KEY)));
      modifyLayoutWithSidebarRate(initSidePanelRate);
    }
  }, [modifyLayoutWithSidebarRate, isLoading, isSidePanelFolded]);

  useEffect(() => {
    const unsubscribeSetDeleteWorkflow = workflowEventBus.subscribe(EVENT_BUS_TYPE.SET_DELETE_WORKFLOW, setWaitDeleteWorkflow);
    return () => {
      unsubscribeSetDeleteWorkflow();
    };
  }, [workflowEventBus]);

  return (
    <>
      {isLoading && <div className="loading-wrapper"><Loading /></div>}
      {!isLoading && (
        <ReactFlowProvider>
          <WorkflowProvider>
            {!isSidePanelFolded && <SidePanel sidePanelDOMRef={sidePanelDOMRef} />}
            {Utils.isDesktop() && !isSidePanelFolded &&
              <ResizeBar
                resizeBarRef={resizeBarRef}
                dragHandlerRef={dragHandlerRef}
                resizeBarStyle={{}}
                dragHandlerStyle={{ height: DRAG_HANDLER_HEIGHT }}
                onResizeMouseDown={onResizeMouseDown}
                onResizeMouseOver={onResizeMouseOver}
              />
            }
            <MainPanel
              mainPanelDOMRef={mainPanelDOMRef}
              isSidePanelFolded={isSidePanelFolded}
              onToggleSidePanelFolded={onToggleSidePanelFolded}
            />
          </WorkflowProvider>
        </ReactFlowProvider>
      )}
      {waitDeleteWorkflow && (
        <DeleteWorkflowDialog
          workflow={waitDeleteWorkflow}
          deleteWorkflow={handleDeleteWorkflow}
          toggle={cancelDeleteWorkflow}
        />
      )}
    </>
  );
};

export default Workflow;
