import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import ModalPortal from '../../../components/modal-portal';
import DeleteRepoDialog from '../../../components/dialog/org-delete-repo-dialog';
import { gettext, orgID, lang } from '../../../utils/constants';
import Department from './department';
import EmptyTip from '../../../components/empty-tip';
import '../../../css/org-department-item.css';

dayjs.locale(lang);

class OrgDepartmentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repos: [],
    };
  }

  componentDidMount() {
    const groupID = this.props.groupID;
    this.listOrgGroupRepo(groupID);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.listOrgGroupRepo(nextProps.groupID);
    }
  }

  listOrgGroupRepo = (groupID) => {
    orgAdminAPI.orgAdminListGroupRepos(orgID, groupID).then(res => {
      this.setState({ repos: res.data.libraries });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onAddNewRepo = (newRepo) => {
    const { repos } = this.state;
    repos.unshift({ ...newRepo, name: newRepo.repo_name }); // 'name': to be compatible with the data returned by the 'GET' request
    this.setState({ repos });
  };

  onDeleteRepo = (repoID) => {
    const { repos } = this.state;
    this.setState({ repos: repos.filter(item => item.repo_id != repoID) });
  };

  render() {
    const { repos } = this.state;
    const groupID = this.props.groupID;

    return (
      <Fragment>
        <Department groupID={groupID} currentItem="repos" onAddNewRepo={this.onAddNewRepo}>
          { repos.length > 0 ?
            <div className="cur-view-content">
              <table>
                <thead>
                  <tr>
                    <th width="5%"></th>
                    <th width="50%">{gettext('Name')}</th>
                    <th width="30%">{gettext('Size')}</th>
                    <th width="15%"></th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((repo, index) => {
                    return (
                      <RepoItem
                        key={index}
                        groupID={groupID}
                        repo={repo}
                        onDeleteRepo={this.onDeleteRepo}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            : <EmptyTip text={gettext('No libraries')} />
          }
        </Department>
      </Fragment>
    );
  }
}

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isDeleteDialogOpen: false
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
      isDeleteDialogOpen: !this.state.isDeleteDialogOpen
    });
  };

  render() {
    const { repo, groupID } = this.props;
    const { highlight, isDeleteDialogOpen } = this.state;
    let iconUrl = Utils.getLibIconUrl(repo);
    return (
      <>
        <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td><img src={iconUrl} width="24" alt={gettext('icon')}/></td>
          <td>{repo.name}</td>
          <td>{Utils.bytesToSize(repo.size)}{' '}</td>
          <td className="cursor-pointer text-center">
            <span onClick={this.toggleDeleteDialog} className={`sf3-font-delete1 sf3-font action-icon ${highlight ? '' : 'vh'}`} title="Delete"></span>
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

const RepoItemPropTypes = {
  repo: PropTypes.object.isRequired,
  groupID: PropTypes.string.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
};

RepoItem.propTypes = RepoItemPropTypes;

const OrgDepartmentItemPropTypes = {
  groupID: PropTypes.string,
};

OrgDepartmentItem.propTypes = OrgDepartmentItemPropTypes;

export default OrgDepartmentItem;
