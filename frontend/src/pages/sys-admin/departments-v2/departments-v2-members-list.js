import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'reactstrap';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import { gettext } from '../../../utils/constants';
import DepartmentsV2MembersItem from './departments-v2-members-item';
import RepoItem from '../departments/repo-item';
import ModalPortal from '../../../components/modal-portal';
import DeleteRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-repo-dialog';

const propTypes = {
  rootNodes: PropTypes.array,
  checkedDepartmentId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  membersList: PropTypes.array,
  isMembersListLoading: PropTypes.bool,
  setMemberStaff: PropTypes.func,
  sortItems: PropTypes.func,
  sortOrder: PropTypes.string,
  sortBy: PropTypes.string,
  deleteMember: PropTypes.func,
  getRepos: PropTypes.func,
};

class DepartmentsV2MembersList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      activeNav: 'members',
      repos: [],
      deletedRepo: {},
      showDeleteRepoDialog: false,
    };
  }

  componentDidMount() {
    this.getRepos(this.props.checkedDepartmentId);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.checkedDepartmentId !== nextProps.checkedDepartmentId || this.props.isAddNewRepo !== nextProps.isAddNewRepo) {
      this.getRepos(nextProps.checkedDepartmentId);
    }
  }

  showDeleteRepoDialog = (repo) => {
    this.setState({
      showDeleteRepoDialog: true,
      deletedRepo: repo,
    });
  };

  toggleCancel = () => {
    this.setState({
      showDeleteRepoDialog: false,
      deletedRepo: {},
    });
  };

  onRepoChanged = () => {
    this.getRepos(this.props.checkedDepartmentId);
  };

  freezeItem = () => {
    this.setState({ isItemFreezed: true });
  };

  unfreezeItem = () => {
    this.setState({ isItemFreezed: false });
  };

  toggleItemFreezed = () => {
    this.setState({ isItemFreezed: !this.state.isItemFreezed });
  };

  getDepartmentName = () => {
    const { rootNodes, checkedDepartmentId } = this.props;
    if (!rootNodes) return '';
    let name = '';
    let arr = [...rootNodes];
    while (!name && arr.length > 0) {
      let curr = arr.shift();
      if (curr.id === checkedDepartmentId) {
        name = curr.name;
      } else if (curr.children && curr.children.length > 0) {
        arr.push(...curr.children);
      }
    }
    return name;
  };

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    let { sortOrder } = this.props;
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortByRole = (e) => {
    e.preventDefault();
    const sortBy = 'role';
    let { sortOrder } = this.props;
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  changeActiveNav = (activeNav) => {
    this.setState({ activeNav });
  };

  getRepos = (id) => {
    this.props.getRepos(id, (repos) => {
      this.setState({ repos });
    });
  };

  render() {
    const { activeNav, repos } = this.state;
    const { membersList, isMembersListLoading, sortBy, sortOrder } = this.props;
    const sortByName = sortBy === 'name';
    const sortByRole = sortBy === 'role';
    const sortIcon = <span className={`sort-dirent sf3-font sf3-font-down ${sortOrder === 'asc' ? 'rotate-180' : ''}`}></span>;

    return (
      <div className="department-content-main">
        <div className="department-content-main-name">{this.getDepartmentName()}</div>

        <div className="cur-view-path tab-nav-container">
          <ul className="nav">
            <li className="nav-item">
              <span className={`nav-link ${activeNav === 'members' ? 'active' : ''}`} onClick={() => this.changeActiveNav('members')}>{gettext('Members')}</span>
            </li>
            <li className="nav-item">
              <span className={`nav-link ${activeNav === 'repos' ? 'active' : ''}`} onClick={() => this.changeActiveNav('repos')}>{gettext('Libraries')}</span>
            </li>
          </ul>
        </div>

        {activeNav === 'members' &&
          <>
            {isMembersListLoading && <Loading />}
            {!isMembersListLoading && membersList.length > 0 &&
              <div className='cur-view-content'>
                <Table hover>
                  <thead>

                    <tr>
                      <th width="60px"></th>
                      <th width="25%" onClick={this.sortByName}>{gettext('Name')}{' '}{sortByName && sortIcon}</th>
                      <th width="23%" onClick={this.sortByRole}>{gettext('Role')}{' '}{sortByRole && sortIcon}</th>
                      <th width="35%">{gettext('Contact email')}</th>
                      <th width="calc(17% - 60px)">{/* Operations */}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersList.map((item, index) => {
                      return (
                        <DepartmentsV2MembersItem
                          key={index}
                          member={item}
                          deleteMember={this.props.deleteMember}
                          setMemberStaff={this.props.setMemberStaff}
                          unfreezeItem={this.unfreezeItem}
                          freezeItem={this.freezeItem}
                          toggleItemFreezed={this.toggleItemFreezed}
                          isItemFreezed={this.state.isItemFreezed}
                        />
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            }
            {!isMembersListLoading && membersList.length === 0 &&
              <EmptyTip text={gettext('No members')} />
            }
          </>
        }

        {(activeNav === 'repos' && repos.length > 0) &&
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
                    <RepoItem key={index} repo={repo} showDeleteRepoDialog={this.showDeleteRepoDialog} />
                  );
                })}
              </tbody>
            </table>
          </div>
        }
        {(activeNav === 'repos' && repos.length === 0) &&
          <EmptyTip text={gettext('No libraries')} />
        }
        {this.state.showDeleteRepoDialog && (
          <ModalPortal>
            <DeleteRepoDialog
              toggle={this.toggleCancel}
              onRepoChanged={this.onRepoChanged}
              repo={this.state.deletedRepo}
              groupID={this.props.checkedDepartmentId}
            />
          </ModalPortal>
        )}
      </div>
    );
  }
}

DepartmentsV2MembersList.propTypes = propTypes;

export default DepartmentsV2MembersList;
