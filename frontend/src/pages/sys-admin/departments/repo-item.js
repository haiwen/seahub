import React from 'react';
import PropTypes from 'prop-types';
import DeleteRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-repo-dialog';
import ModalPortal from '../../../components/modal-portal';
import OpIcon from '../../../components/op-icon';
import { siteRoot, gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const { enableSysAdminViewRepo } = window.sysadmin.pageOptions;

const RepoItemPropTypes = {
  repo: PropTypes.object.isRequired,
  groupID: PropTypes.number.isRequired,
  onRepoChanged: PropTypes.func.isRequired,
};

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
    const { repo, groupID, onRepoChanged } = this.props;
    const { highlight, isDeleteDialogOpen } = this.state;
    const repoName = repo.name || repo.repo_name;
    let iconUrl = Utils.getLibIconUrl(repo);
    return (
      <>
        <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td><img src={iconUrl} width="24" alt="" /></td>
          <td>
            {enableSysAdminViewRepo
              ? <a href={`${siteRoot}sys/libraries/${repo.repo_id}/${encodeURIComponent(repoName)}/`}>{repoName}</a>
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
              onRepoChanged={onRepoChanged}
              repo={repo}
              groupID={groupID}
            />
          </ModalPortal>
        )}
      </>
    );
  }
}

RepoItem.propTypes = RepoItemPropTypes;

export default RepoItem;
