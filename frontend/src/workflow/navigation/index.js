import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import EmptyTip from '../../components/empty-tip';
import WorkflowNavTree from './nav-tree';
import NewWorkflowFolderEditor from './new-folder-editor';
import NewWorkflowEditor from './new-workflow-editor';
import { useWorkflows } from '../hooks/workflows';
import { WORKFLOW_NAV_LEFT_INDENT, WORKFLOW_NAV_TYPE_MAP } from '../constants/nav';
import { gettext } from '../../utils/constants';

import './index.css';

const WorkflowNavigation = ({ isShowNewFolderEditor, isShowNewWorkflowEditor, closeNewFolderEditor, closeNewWorkflowEditor }) => {
  const { navigation, addNewFolder, addNewWorkflow } = useWorkflows();

  const isEmpty = useMemo(() => !Array.isArray(navigation) || navigation.length === 0, [navigation]);
  const hasFolder = useMemo(() => Array.isArray(navigation) ? navigation.some((nav) => nav.type === WORKFLOW_NAV_TYPE_MAP.FOLDER) : false, [navigation]);
  const initialLeftIndent = useMemo(() => hasFolder ? WORKFLOW_NAV_LEFT_INDENT : 0, [hasFolder]);

  const handleAddNewFolder = useCallback((name) => {
    addNewFolder(name, () => {
      closeNewFolderEditor();
    });
  }, [addNewFolder, closeNewFolderEditor]);

  const handleAddNewWorkflow = useCallback((name, folderId) => {
    addNewWorkflow({ name }, {
      folderId,
      successCallback: () => {
        closeNewWorkflowEditor();
      }
    });
  }, [addNewWorkflow, closeNewWorkflowEditor]);

  return (
    <>
      <div className="workflow-nav">
        {!isEmpty && (
          <WorkflowNavTree
            leftIndent={initialLeftIndent}
          />
        )}
        {isShowNewFolderEditor && (
          <NewWorkflowFolderEditor
            key="workflow-nav-new-folder-editor"
            leftIndent={initialLeftIndent}
            addNewFolder={handleAddNewFolder}
            cancelAddNewFolder={closeNewFolderEditor}
          />
        )}
        {isShowNewWorkflowEditor && (
          <NewWorkflowEditor
            key="workflow-nav-new-workflow-editor"
            leftIndent={initialLeftIndent}
            addNewWorkflow={handleAddNewWorkflow}
            cancelAddNewWorkflow={closeNewWorkflowEditor}
          />
        )}
      </div>
      {(isEmpty && !isShowNewWorkflowEditor && !isShowNewFolderEditor) && <EmptyTip text={gettext('No workflows')} />}
    </>
  );
};

WorkflowNavigation.propTypes = {
  isShowNewFolderEditor: PropTypes.bool,
  isShowNewWorkflowEditor: PropTypes.bool,
  closeNewFolderEditor: PropTypes.func,
  closeNewWorkflowEditor: PropTypes.func,
};

export default WorkflowNavigation;
