import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import OrgDeleteRepoDialog from '../../dialog/org-delete-repo-dialog';
import SysAdminDeleteRepoDialog from '../../dialog/sysadmin-dialog/sysadmin-delete-repo-dialog';
import ModalPortal from '../../modal-portal';
import OpIcon from '../../op-icon';

const propTypes = {
  repo: PropTypes.object.isRequired,
  groupID: PropTypes.number.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  isSysAdmin: PropTypes.bool,
  enableSysAdminViewRepo: PropTypes.bool,
};

const getDeleteRepoDialog = (isSysAdmin) => (
  isSysAdmin ? SysAdminDeleteRepoDialog : OrgDeleteRepoDialog
);

const getRepoUrl = (repoName, repoID) => (
  `${siteRoot}sys/libraries/${repoID}/${encodeURIComponent(repoName)}/`
);

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isDeleteDialogOpen: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ highlight: true });
  };

  onMouseLeave = () => {
    this.setState({ highlight: false });
  };

  toggleDeleteDialog = () => {
    this.setState({
      isDeleteDialogOpen: !this.state.isDeleteDialogOpen,
    });
  };

  render() {
    const { repo, groupID, isSysAdmin, enableSysAdminViewRepo } = this.props;
    const { highlight, isDeleteDialogOpen } = this.state;
    const repoName = repo.name || repo.repo_name;
    const DeleteRepoDialog = getDeleteRepoDialog(isSysAdmin);
    const showRepoLink = isSysAdmin && enableSysAdminViewRepo;
    const iconUrl = Utils.getLibIconUrl(repo);

    return (
      <>
        <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td><img src={iconUrl} width="24" alt={gettext('icon')} /></td>
          <td>
            {showRepoLink
              ? <a href={getRepoUrl(repoName, repo.repo_id)}>{repoName}</a>
              : <span>{repoName}</span>
            }
          </td>
          <td>{Utils.bytesToSize(repo.size)}</td>
          <td className="cursor-pointer text-center">
            <OpIcon
              className={`op-icon ${highlight ? '' : 'vh'}`}
              symbol="delete"
              title={gettext('Delete')}
              op={this.toggleDeleteDialog}
            />
          </td>
        </tr>
        {isDeleteDialogOpen && (
          <ModalPortal>
            <DeleteRepoDialog
              toggle={this.toggleDeleteDialog}
              onDeleteRepo={this.props.onDeleteRepo}
              repo={repo}
              groupID={groupID}
            />
          </ModalPortal>
        )}
      </>
    );
  }
}

RepoItem.propTypes = propTypes;
RepoItem.defaultProps = {
  isSysAdmin: false,
  enableSysAdminViewRepo: false,
};

export default RepoItem;
