import { createRoot } from 'react-dom/client';
import Workflow from './workflow';
import { WorkflowsProvider } from './workflow/hooks/workflows';

import './css/layout.css';

const RepoWorkflows = () => {
  const { repoID, repoName } = window.app.pageOptions;

  return (
    <div id="main" className="repo-workflow-main">
      <WorkflowsProvider repoID={repoID} repoName={repoName}>
        <Workflow />
      </WorkflowsProvider>
    </div>
  );
};

const mountEl = document.getElementById('wrapper');
if (mountEl) {
  const root = createRoot(mountEl);
  root.render(<RepoWorkflows />);
}
