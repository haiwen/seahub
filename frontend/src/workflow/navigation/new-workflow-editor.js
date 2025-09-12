import { useCallback } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import Icon from '../../components/icon';
import WorkflowNameEditor from '../components/name-editor';
import { gettext } from '../../utils/constants';

const NewWorkflowEditor = ({ leftIndent = 0, cancelAddNewWorkflow, addNewWorkflow }) => {

  const handleSave = useCallback((name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toaster.closeAll();
      toaster.danger(gettext('Name is required'));
      return;
    }
    addNewWorkflow(name);
  }, [addNewWorkflow]);

  const handleCancelEditName = useCallback(() => {
    cancelAddNewWorkflow();
  }, [cancelAddNewWorkflow]);

  return (
    <div className="workflow-nav-tree-node">
      <div className="workflow-nav-tree-node-inner">
        <div className="workflow-nav-tree-node-main">
          <div className="workflow-nav-tree-node-content" style={{ paddingLeft: leftIndent || 0 }}>
            <Icon symbol="workflow" />
            <div className="workflow-nav-tree-node-name-editor-wrapper">
              <WorkflowNameEditor
                initialName={gettext('Untitled workflow')}
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

NewWorkflowEditor.propTypes = {
  leftIndent: PropTypes.number,
  cancelAddNewWorkflow: PropTypes.func,
  addNewWorkflow: PropTypes.func,
};

export default NewWorkflowEditor;
