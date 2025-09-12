import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import deepCopy from 'deep-copy';
import workflowAPI from '../../utils/workflow-api';
import { WORKFLOW_NAV_TYPE_MAP } from '../constants/nav';
import EventBus from '../../components/common/event-bus';
import { addNavWorkflow, deleteNavFolder, deleteNavWorkflow, findFirstWorkflow, getNavFolderById } from '../utils/nav';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';
import { normalizeWorkflowGraph } from '../utils/common';
import Workflow from '../model/workflow';
import { EVENT_BUS_TYPE } from '../constants/event-bus-type';

const WorkflowsContext = createContext();
export const WorkflowsProvider = ({ repoID, repoName, children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [navigation, setNavigation] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [settingsMode, setSettingsMode] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

  const eventBusRef = useRef(new EventBus());

  const canDragNav = false;

  useEffect(() => {
    workflowAPI.listWorkflows(repoID).then(res => {
      const workflows = res?.data?.workflows || [];
      const navigation = workflows.map((workflow) => {
        return {
          id: workflow.id,
          type: WORKFLOW_NAV_TYPE_MAP.WORKFLOW,
        };
      });
      setWorkflows(workflows);
      setNavigation(navigation);
      setSelectedWorkflowId(workflows[0].id);
      setIsLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setIsLoading(false);
    });
  }, [repoID]);

  const modifySelectedWorkflow = useCallback((workflowId) => {
    if (workflowId === selectedWorkflowId) return;
    setSelectedWorkflowId(workflowId);
  }, [selectedWorkflowId]);

  const addNewFolder = useCallback((folderName, successCallback) => {
    let newNavigation = [...navigation];
    newNavigation.push({ id: Math.random().toString(), name: folderName, type: WORKFLOW_NAV_TYPE_MAP.FOLDER });
    setNavigation(newNavigation);
    successCallback && successCallback();
  }, [navigation]);

  const addNewWorkflow = useCallback((workflowData, folderId, successCallback) => {
    let normalizedWorkflowData = workflowData || {};
    normalizedWorkflowData.graph = JSON.stringify(normalizeWorkflowGraph(workflowData.graph));
    workflowAPI.createWorkflow(repoID, normalizedWorkflowData).then(res => {
      const newWorkflow = new Workflow(res?.data || {});
      if (newWorkflow.id) {
        let newWorkflows = [...workflows];
        let newNavigation = deepCopy(navigation);
        const newNavWorkflow = { id: newWorkflow.id, type: WORKFLOW_NAV_TYPE_MAP.WORKFLOW };
        addNavWorkflow(newNavWorkflow, folderId, newNavigation);
        newWorkflows.push(newWorkflow);
        newNavigation.push();
        setWorkflows(newWorkflows);
        setNavigation(newNavigation);
        setSelectedWorkflowId(newWorkflow.id);
        successCallback && successCallback();
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, workflows, navigation]);

  const modifyWorkflow = useCallback((workflowId, workflowData, successCallback) => {
    workflowAPI.updateWorkflow(repoID, workflowId, workflowData).then(res => {
      let newWorkflows = [...workflows];
      let targetIndex = newWorkflows.findIndex(workflow => workflow.id === workflowId);
      if (targetIndex < 0) return;
      let updateWorkflow = deepCopy(newWorkflows[targetIndex]);
      updateWorkflow = Object.assign(updateWorkflow, workflowData);
      newWorkflows[targetIndex] = updateWorkflow;
      setWorkflows(newWorkflows);
      successCallback && successCallback();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, workflows]);

  const deleteWorkflow = useCallback((workflowId) => {
    workflowAPI.deleteWorkflow(repoID, workflowId).then(res => {
      const newNavigation = deepCopy(navigation);
      const success = deleteNavWorkflow(workflowId, newNavigation);
      if (!success) return;
      let newWorkflows = [...workflows];
      let targetIndex = newWorkflows.findIndex(workflow => workflow.id === workflowId);
      if (targetIndex < 0) return;
      newWorkflows.splice(targetIndex, 1);
      setNavigation(newNavigation);
      setWorkflows(newWorkflows);
      if (workflowId === selectedWorkflowId) {
        const firstWorkflow = findFirstWorkflow(newNavigation, newWorkflows);
        if (firstWorkflow) {
          setSelectedWorkflowId(firstWorkflow.id);
        }
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, navigation, workflows, selectedWorkflowId]);

  const modifyFolder = useCallback((folderId, folderData, successCallback) => {
    const newNavigation = deepCopy(navigation);
    let targetFolder = getNavFolderById(folderId, newNavigation);
    if (!targetFolder) return;
    targetFolder = Object.assign(targetFolder, folderData);
    setNavigation(newNavigation);
    successCallback && successCallback();
  }, [navigation]);

  const deleteFolder = useCallback((folderId) => {
    const targetFolder = getNavFolderById(folderId, navigation);
    if (!targetFolder) return;
    const newNavigation = deepCopy(navigation);
    const success = deleteNavFolder(folderId, newNavigation);
    if (!success) return;

    if (Array.isArray(targetFolder.children)) {
      let deletedWorkflowsId = targetFolder.children.map((childNav) => {
        if (childNav.type !== WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
          return null;
        }
        return childNav.id;
      }).filter(Boolean);
      if (deletedWorkflowsId.length > 0) {
        const newWorkflows = workflows.filter(workflow => !deletedWorkflowsId.includes(workflow.id));
        setWorkflows(newWorkflows);
        if (deletedWorkflowsId.includes(selectedWorkflowId)) {
          const firstWorkflow = findFirstWorkflow(newNavigation, newWorkflows);
          if (firstWorkflow) {
            setSelectedWorkflowId(firstWorkflow.id);
          }
        }
      }
    }
    setNavigation(newNavigation);
  }, [navigation, workflows, selectedWorkflowId]);

  const moveNav = useCallback(() => { }, []);

  const handleSetSettingsMode = useCallback((mode) => {
    setSettingsMode(mode);
  }, []);

  useEffect(() => {
    const unsubscribeSetSettingsMode = eventBusRef.current.subscribe(EVENT_BUS_TYPE.SET_SETTINGS_MODE, handleSetSettingsMode);
    return () => {
      unsubscribeSetSettingsMode();
    };
  }, [handleSetSettingsMode]);

  return (
    <WorkflowsContext.Provider value={{
      repoID,
      workflowEventBus: eventBusRef.current,
      repoName,
      isLoading,
      navigation,
      workflows,
      selectedWorkflowId,
      canDragNav,
      settingsMode,
      moveNav,
      modifySelectedWorkflow,
      addNewFolder,
      addNewWorkflow,
      modifyWorkflow,
      deleteWorkflow,
      modifyFolder,
      deleteFolder,
    }}>
      {children}
    </WorkflowsContext.Provider>
  );
};

export const useWorkflows = () => {
  const context = useContext(WorkflowsContext);
  if (!context) throw new Error('\'WorkflowsContext\' is null');
  return context;
};
