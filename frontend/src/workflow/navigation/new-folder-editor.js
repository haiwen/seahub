import { useCallback } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import WorkflowNameEditor from '../components/name-editor';
import { gettext } from '../../utils/constants';

const NewWorkflowFolderEditor = ({ cancelAddNewFolder, addNewFolder }) => {

  const handleSave = useCallback((name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toaster.closeAll();
      toaster.danger(gettext('Name is required'));
      return;
    }
    addNewFolder(name);
  }, [addNewFolder]);

  const handleCancelEditName = useCallback(() => {
    cancelAddNewFolder();
  }, [cancelAddNewFolder]);

  return (
    <div className="workflow-nav-tree-node">
      <div className="workflow-nav-tree-node-inner">
        <div className="workflow-nav-tree-node-main">
          <div className="workflow-nav-tree-node-content">
            <span className="workflow-nav-tree-node-icon-down-wrapper"><i className="folder-toggle-icon sf3-font sf3-font-down workflow-nav-tree-node-icon" aria-hidden="true"></i></span>
            <i className="sf3-font sf3-font-folder workflow-nav-tree-node-icon" aria-hidden="true"></i>
            <div className="workflow-nav-tree-node-name-editor-wrapper">
              <WorkflowNameEditor
                onCancel={handleCancelEditName}
                saveName={handleSave}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

NewWorkflowFolderEditor.propTypes = {
  cancelAddNewFolder: PropTypes.func,
  addNewFolder: PropTypes.func,
};

export default NewWorkflowFolderEditor;
