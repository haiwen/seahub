import { gettext } from '../../../../utils/constants';
import Icon from '../../../../components/icon';

const SummaryCards = ({ totalFiles, totalCollaborators }) => {
  return (
    <div className="card-container">
      <div className="summary-card">
        <Icon className="summary-icon" symbol="file-count" />
        <div className="summary-content">
          <div className="summary-number">{totalFiles.toLocaleString()}</div>
          <div className="summary-label">{gettext('Files')}</div>
        </div>
      </div>
      <div className="summary-card">
        <Icon className="summary-icon" symbol="collaborator-count" />
        <div className="summary-content">
          <div className="summary-number">{totalCollaborators.toLocaleString()}</div>
          <div className="summary-label">{gettext('Collaborators')}</div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
