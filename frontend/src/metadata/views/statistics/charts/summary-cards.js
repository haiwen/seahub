import { gettext, mediaUrl } from '../../../../utils/constants';

import './summary-cards.css';

const SummaryCards = ({ totalFiles, totalCollaborators }) => {
  return (
    <div className="card-container">
      <div className="summary-card">
        <img
          className="summary-icon"
          width="16"
          src={`${mediaUrl}img/file-count.png`}          
          alt={gettext('Files')}
          title={gettext('Files')}
        />
        <div className="summary-content">
          <div className="summary-number">{totalFiles.toLocaleString()}</div>
          <div className="summary-label">{gettext('Files')}</div>
        </div>
      </div>
      <div className="summary-card">
        <img
          className="summary-icon"
          width="16"
          src={`${mediaUrl}img/collaborator-count.png`}
          alt={gettext('Collaborators')}
          title={gettext('Collaborators')}
        />
        <div className="summary-content">
          <div className="summary-number">{totalCollaborators.toLocaleString()}</div>
          <div className="summary-label">{gettext('Collaborators')}</div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
