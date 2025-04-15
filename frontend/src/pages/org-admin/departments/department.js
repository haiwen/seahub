import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle } from 'reactstrap';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import { gettext } from '../../../utils/constants';
import MemberItem from './member-item';
import RepoItem from './repo-item';
import DepartmentNodeMenu from './departments-node-dropdown-menu';

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

class Department extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      activeNav: 'members',
      repos: [],
      dropdownOpen: false,
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

  freezeItem = () => {
    this.setState({ isItemFreezed: true });
  };

  unfreezeItem = () => {
    this.setState({ isItemFreezed: false });
  };

  getCurrentDepartment = () => {
    const { rootNodes, checkedDepartmentId } = this.props;
    if (!rootNodes) return {};
    let currentDepartment = {};
    let arr = [...rootNodes];
    while (!currentDepartment.id && arr.length > 0) {
      let curr = arr.shift();
      if (curr.id === checkedDepartmentId) {
        currentDepartment = curr;
      } else if (curr.children && curr.children.length > 0) {
        arr.push(...curr.children);
      }
    }
    return currentDepartment;
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

  dropdownToggle = (e) => {
    e.stopPropagation();
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  };

  onDeleteRepo = (repoID) => {
    const { repos } = this.state;
    this.setState({ repos: repos.filter(item => item.repo_id != repoID) });
  };

  render() {
    const { activeNav, repos } = this.state;
    const { membersList, isMembersListLoading, sortBy, sortOrder } = this.props;
    const sortByName = sortBy === 'name';
    const sortByRole = sortBy === 'role';
    const sortIcon = <span className={`sort-dirent sf3-font sf3-font-down ${sortOrder === 'asc' ? 'rotate-180' : ''}`}></span>;
    const currentDepartment = this.getCurrentDepartment();

    return (
      <div className="department-content-main d-flex flex-column">
        <div className="cur-view-path justify-content-start">
          <h4 className="sf-heading">{currentDepartment.name}</h4>
          <Dropdown
            isOpen={this.state.dropdownOpen}
            toggle={(e) => this.dropdownToggle(e)}
            direction="down"
            className="department-dropdown-menu"
          >
            <DropdownToggle
              tag='span'
              role="button"
              className='sf3-font-down sf3-font ml-1 sf-dropdown-toggle'
              title={gettext('More operations')}
              aria-label={gettext('More operations')}
              data-toggle="dropdown"
            />
            <DepartmentNodeMenu
              node={currentDepartment}
              toggleAddDepartment={this.props.toggleAddDepartment}
              toggleSetQuotaDialog={this.props.toggleSetQuotaDialog}
              toggleAddLibrary={this.props.toggleAddLibrary}
              toggleAddMembers={this.props.toggleAddMembers}
              toggleRename={this.props.toggleRename}
              toggleDelete={this.props.toggleDelete}
            />
          </Dropdown>
        </div>

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
                <table>
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
                        <MemberItem
                          key={index}
                          member={item}
                          deleteMember={this.props.deleteMember}
                          setMemberStaff={this.props.setMemberStaff}
                          unfreezeItem={this.unfreezeItem}
                          freezeItem={this.freezeItem}
                          isItemFreezed={this.state.isItemFreezed}
                        />
                      );
                    })}
                  </tbody>
                </table>
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
                    <RepoItem
                      key={index}
                      repo={repo}
                      groupID={this.props.checkedDepartmentId}
                      onDeleteRepo={this.onDeleteRepo}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        }
        {(activeNav === 'repos' && repos.length === 0) &&
          <EmptyTip text={gettext('No libraries')} />
        }
      </div>
    );
  }
}

Department.propTypes = propTypes;

export default Department;
