import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import RepoHistoryTable from '../repo-history-view';

import '../../css/repo-history.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class RepoHistory extends React.Component {

  render() {
    const { repoID, userPerm, currentRepoInfo, toggleDialog } = this.props;
    const { repo_name: repoName } = currentRepoInfo;

    let title = gettext('{placeholder} Modification History');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');

    return (
      <Modal isOpen={true} toggle={toggleDialog} size='xl' id="repo-history-dialog">
        <SeahubModalHeader toggle={toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </SeahubModalHeader>
        <ModalBody>
          {userPerm == 'rw' && <p className="repo-snapshot-tip">{gettext('Tip: a snapshot will be generated after modification, which records the library state after the modification.')}</p>}
          <RepoHistoryTable
            repoID={repoID}
            userPerm={userPerm}
          />
        </ModalBody>
      </Modal>
    );
  }
}

RepoHistory.propTypes = propTypes;

export default RepoHistory;
