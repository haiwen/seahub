import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import deepCopy from 'deep-copy';
import { WORKFLOW_NAV_TYPE_MAP } from '../constants/nav';
import EventBus from '../../components/common/event-bus';
import { addNavWorkflow, deleteNavFolder, deleteNavWorkflow, findFirstWorkflow, getNavFolderById } from '../utils/nav';

const WorkflowsContext = createContext();
export const WorkflowsProvider = ({ repoID, repoName, children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [navigation, setNavigation] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

  const eventBusRef = useRef(new EventBus());

  const canDragNav = false;

  useEffect(() => {
    let workflows = [
      { id: '1', name: 'New workflow1' },
      { id: '2', name: 'New workflow2' },
    ];
    const navigation = workflows.map((workflow) => {
      return {
        id: workflow.id,
        type: WORKFLOW_NAV_TYPE_MAP.WORKFLOW,
      };
    });

    workflows.push({ id: '3', name: 'New workflow3' });
    navigation.push({ id: '__folder1__', name: 'Folder1', type: WORKFLOW_NAV_TYPE_MAP.FOLDER, children: [{ id: '3', type: WORKFLOW_NAV_TYPE_MAP.WORKFLOW, }] });

    setWorkflows(workflows);
    setNavigation(navigation);
    setSelectedWorkflowId(workflows[0].id);
    setIsLoading(false);
  }, []);

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
    let newWorkflows = [...workflows];
    const newWorkflow = { id: Math.random().toString(), ...workflowData };
    const newNavWorkflow = { id: newWorkflow.id, type: WORKFLOW_NAV_TYPE_MAP.WORKFLOW };
    const newNavigation = deepCopy(navigation);
    addNavWorkflow(newNavWorkflow, folderId, newNavigation);
    newWorkflows.push(newWorkflow);
    newNavigation.push();
    setWorkflows(newWorkflows);
    setNavigation(newNavigation);
    setSelectedWorkflowId(newWorkflow.id);
    successCallback && successCallback();
  }, [workflows, navigation]);

  const modifyWorkflow = useCallback((workflowId, workflowData, successCallback) => {
    let newWorkflows = [...workflows];
    let targetIndex = newWorkflows.findIndex(workflow => workflow.id === workflowId);
    if (targetIndex < 0) return;
    let updateWorkflow = deepCopy(newWorkflows[targetIndex]);
    updateWorkflow = Object.assign(updateWorkflow, workflowData);
    newWorkflows[targetIndex] = updateWorkflow;
    setWorkflows(newWorkflows);
    successCallback && successCallback();
  }, [workflows]);

  const deleteWorkflow = useCallback((workflowId) => {
    const newNavigation = deepCopy(navigation);
    const success = deleteNavWorkflow(workflowId, newNavigation);
    if (!success) return;
    let newWorkflows = [...workflows];
    let targetIndex = newWorkflows.findIndex(workflow => workflow.id === workflowId);
    if (targetIndex < 0) return;
    newWorkflows.splice(targetIndex, 1);
    console.log(newNavigation, newWorkflows);
    setNavigation(newNavigation);
    setWorkflows(newWorkflows);
    if (workflowId === selectedWorkflowId) {
      const firstWorkflow = findFirstWorkflow(newNavigation, newWorkflows);
      if (firstWorkflow) {
        setSelectedWorkflowId(firstWorkflow.id);
      }
    }
  }, [navigation, workflows, selectedWorkflowId]);

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
