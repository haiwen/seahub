import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SortMenu from '../../../components/sort-menu';
import Paginator from '../../../components/paginator';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import ModalPortal from '../../../components/modal-portal';
import DeleteRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-repo-dialog';
import DepartmentNodeMenu from './departments-node-dropdown-menu';
import MemberItem from './member-item';
import RepoItem from './repo-item';

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
  getPreviousPageList: PropTypes.func,
  getNextPageList: PropTypes.func,
  resetPerPage: PropTypes.func,
  currentPageInfo: PropTypes.object,
  perPage: PropTypes.number,
};

class Department extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      activeNav: 'members',
      repos: [],
      deletedRepo: {},
      showDeleteRepoDialog: false,
      dropdownOpen: false,
    };

    this.sortOptions = [
      { value: 'name-asc', text: gettext('Ascending by name') },
      { value: 'name-desc', text: gettext('Descending by name') },
      { value: 'role-asc', text: gettext('Ascending by role') },
      { value: 'role-desc', text: gettext('Descending by role') }
    ];
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

  onSelectSortOption = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
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

  render() {
    const { activeNav, repos } = this.state;
    const { membersList, isMembersListLoading, sortBy, sortOrder } = this.props;
    const showSortIcon = activeNav == 'members';
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

          {showSortIcon &&
          <SortMenu
            sortBy={sortBy}
            sortOrder={sortOrder}
            sortOptions={this.sortOptions}
            onSelectSortOption={this.onSelectSortOption}
          />
          }
        </div>

        {activeNav === 'members' && (
          <div className='cur-view-content'>
            {isMembersListLoading
              ? <Loading />
              : membersList.length == 0
                ? <EmptyTip text={gettext('No members')} />
                : (
                  <div className="w-xs-250">
                    <table>
                      <thead>
                        <tr>
                          <th width="10%"></th>
                          <th width="25%">{gettext('Name')}</th>
                          <th width="25%">{gettext('Role')}</th>
                          <th width="30%">{gettext('Contact email')}</th>
                          <th width="10%">{/* Operations */}</th>
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
                    {this.props.currentPageInfo &&
                    <Paginator
                      gotoPreviousPage={this.props.getPreviousPageList}
                      gotoNextPage={this.props.getNextPageList}
                      currentPage={this.props.currentPageInfo.current_page}
                      hasNextPage={this.props.currentPageInfo.has_next_page}
                      curPerPage={this.props.perPage}
                      resetPerPage={this.props.resetPerPage}
                      noURLUpdate={true}
                    />
                    }
                  </div>
                )}
          </div>
        )}

        {activeNav === 'repos' && (
          <div className="cur-view-content">
            {repos.length == 0
              ? <EmptyTip text={gettext('No libraries')} />
              : (
                <>
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
                </>
              )
            }
          </div>
        )}
      </div>
    );
  }
}

Department.propTypes = propTypes;

export default Department;
