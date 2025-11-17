import { getWorkflowById } from './common';
import { WORKFLOW_NAV_TYPE_MAP } from '../constants/nav';

export const findFirstWorkflowFromNavList = (navList, workflows) => {
  let firstWorkflow = null;
  for (let i = 0, len = navList.length; i < len; i++) {
    const nav = navList[i];
    const { id: navId, type: navType } = nav || {};
    if (navType === WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
      const workflow = getWorkflowById(navId, workflows);
      if (workflow) {
        firstWorkflow = workflow;
        break;
      }
    }
  }
  return firstWorkflow;
};

export const findFirstWorkflow = (navigation, workflows) => {
  if (!Array.isArray(navigation) || !Array.isArray(workflows)) return null;
  let firstWorkflow = findFirstWorkflowFromNavList(navigation, workflows);
  if (!firstWorkflow) {
    // find first workflow from folder
    for (let i = 0, len = navigation.length; i < len; i++) {
      const nav = navigation[i];
      const { type: navType } = nav || {};
      if (navType === WORKFLOW_NAV_TYPE_MAP.FOLDER && Array.isArray(nav.children)) {
        firstWorkflow = findFirstWorkflowFromNavList(nav.children, workflows);
        if (firstWorkflow) {
          break;
        }
      }
    }
  }
  return firstWorkflow;
};

export const getNavFolderById = (folderId, navigation) => {
  return navigation.find((nav) => nav.id === folderId && nav.type === WORKFLOW_NAV_TYPE_MAP.FOLDER);
};

export const getNavWorkflowIndexById = (navId, navList) => {
  if (!Array.isArray(navList)) return -1;
  return navList.findIndex((nav) => nav.id === navId && nav.type === WORKFLOW_NAV_TYPE_MAP.WORKFLOW);
};

export const deleteNavWorkflowFromNavList = (navId, navList) => {
  const targetIndex = getNavWorkflowIndexById(navId, navList);
  if (targetIndex > -1) {
    navList.splice(targetIndex, 1);
    return true;
  }
  return false;
};

export const deleteNavWorkflow = (workflowId, navigation) => {
  if (!Array.isArray(navigation)) return false;
  let success = deleteNavWorkflowFromNavList(workflowId, navigation);
  if (success) {
    return true;
  }

  // try to remove workflow from folder
  navigation.forEach(nav => {
    if (!success && nav.type === WORKFLOW_NAV_TYPE_MAP.FOLDER) {
      success = deleteNavWorkflowFromNavList(workflowId, nav.children);
    }
  });
  return success;
};

export const addNavWorkflow = (navWorkflow, folderId, navigation) => {
  if (!folderId) {
    navigation.push(navWorkflow);
    return;
  } else {
    let added = false;
    navigation.forEach((currNav) => {
      if (!added && currNav.id === folderId && currNav.type === WORKFLOW_NAV_TYPE_MAP.FOLDER) {
        if (Array.isArray(currNav.children)) {
          currNav.children.push(navWorkflow);
        } else {
          currNav.children = [navWorkflow];
        }
        added = true;
      }
    });
    if (!added) {
      navigation.push(navWorkflow);
    }
  }
};

export const getNavFolderIndexById = (folderId, navigation) => {
  return navigation.findIndex((nav) => nav.id === folderId && nav.type === WORKFLOW_NAV_TYPE_MAP.FOLDER);
};

export const deleteNavFolder = (folderId, navigation) => {
  if (!Array.isArray(navigation) || !folderId) return false;
  const targetIndex = getNavFolderIndexById(folderId, navigation);
  if (targetIndex < 0) return false;
  navigation.splice(targetIndex, 1);
  return true;
};
