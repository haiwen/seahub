import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
import toaster from '../../../components/toast';
import ModalPortal from '../../../components/modal-portal';
import DeleteRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-repo-dialog';
import { gettext, lang } from '../../../utils/constants';
import RepoItem from './repo-item';
import Department from './department';
import '../../../css/org-department-item.css';

moment.locale(lang);

const DepartmentDetailPropTypes = {
  groupID: PropTypes.string,
};

class DepartmentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repos: [],
      deletedRepo: {},
      showDeleteRepoDialog: false
    };
  }

  componentDidMount() {
    const { groupID } = this.props;
    this.listGroupRepo(groupID);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.listGroupRepo(nextProps.groupID);
    }
  }

  listGroupRepo = (groupID) => {
    seafileAPI.sysAdminListGroupRepos(groupID).then(res => {
      this.setState({ repos: res.data.libraries });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleCancel = () => {
    this.setState({
      showDeleteRepoDialog: false
    });
  }

  onRepoChanged = () => {
    this.listGroupRepo(this.props.groupID);
  }

  showDeleteRepoDialog = (repo) => {
    this.setState({ showDeleteRepoDialog: true, deletedRepo: repo });
  }

  onAddNewRepo = (newRepo) => {
    const { repos } = this.state;
    repos.unshift(newRepo);
    this.setState({ repos });
  }

  render() {
    const { repos } = this.state;
    const { groupID } = this.props;

    return (
      <Fragment>
        <Department groupID={groupID} currentItem="repos" onAddNewRepo={this.onAddNewRepo}>
          {repos.length > 0 ?
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
            : <p className="no-libraty">{gettext('No libraries')}</p>
          }
        </Department>
        {this.state.showDeleteRepoDialog && (
          <ModalPortal>
            <DeleteRepoDialog
              toggle={this.toggleCancel}
              onRepoChanged={this.onRepoChanged}
              repo={this.state.deletedRepo}
              groupID={groupID}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

DepartmentDetail.propTypes = DepartmentDetailPropTypes;

export default DepartmentDetail;
