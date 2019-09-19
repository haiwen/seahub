import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../components/loading';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Workspace from './model/workspace';
import DTableWorkspaceCommon from './dtable-workspace-common';
import DTableWorkspaceShared from './dtable-workspace-shared';
import CreateTableDialog from '../../components/dialog/create-table-dialog';

const propTypes = {

};

class MainPanelDTables extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      errorMsg: null,
      workspaceList: [],
      sharedTableList: [],
      isWorkspaceListLoading: true,
      isSharedTableListLoading: true,
      isShowCreateDialog: false
    }
  }

  componentDidMount() {
    this.loadWorkspaceList();
    this.loadSharedTableList();
  }

  loadWorkspaceList = () => {
    seafileAPI.listWorkspaces().then((res) => {
      let workspaceList = res.data.workspace_list.map(item => {
        return new Workspace(item);
      });
      this.setState({
        isWorkspaceListLoading: false,
        workspaceList: workspaceList,
      });
    }).catch((error) => {
      this.errorCallbackHandle(error);
    });
  }

  loadSharedTableList = () => {
    seafileAPI.listSharedTables().then((res) => {
      this.setState({
        isSharedTableListLoading: false,
        sharedTableList: res.data.table_list,
      });
    }).catch((error) => {
      this.errorCallbackHandle(error);
    });
  }

  errorCallbackHandle = (error) => {
    if (error.response) {
      this.setState({
        loading: false,
        errorMsg: gettext('Error')
      });
    } else {
      this.setState({
        loading: false,
        errorMsg: gettext('Please check the network.')
      });
    }
  }

  onCreateTableToggle = () => {
    this.setState({isShowCreateDialog: !this.state.isShowCreateDialog});
  }

  onCreateTable = (tableName, owner) => {
    seafileAPI.createTable(tableName, owner).then(() => {
      this.loadWorkspaceList();
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });

    this.onCreateTableToggle();
  }

  render() {
    let { isWorkspaceListLoading, isSharedTableListLoading } = this.state;
    if (isWorkspaceListLoading || isSharedTableListLoading) {
      return <Loading />
    }

    let { workspaceList, sharedTableList } = this.state;
    let personalWorkspace = workspaceList.find(workspace => {
      return workspace.owner_type === 'Personal';
    });

    let groupWorkspaceList = workspaceList.filter(workspace => {
      return workspace.owner_type === 'Group';
    });

    return (
      <Fragment>
        <div className="main-panel-center dtable-center">
          <div className="main-panel-container d-flex flex-1 flex-column">
            <div className="cur-view-title">DTable</div>
            <div className="cur-view-content">
              {this.state.errorMsg &&
                <p className="error text-center">{this.state.errorMsg}</p>
              }
              {!this.state.errorMsg && (
                <Fragment>
                  <DTableWorkspaceCommon workspace={personalWorkspace} />
                  <DTableWorkspaceShared tableList={sharedTableList} />
                  {groupWorkspaceList.length > 0 && groupWorkspaceList.map((workspace, index) => {
                    return (<DTableWorkspaceCommon key={index} workspace={workspace} />)
                  })}
                  <button className="btn btn-secondary dtable-add-btn mb-4" onClick={this.onCreateTableToggle}>{gettext('New DTable')}</button>
                </Fragment>
              )}
            </div>
          </div>
        </div>
        {this.state.isShowCreateDialog && (
          <CreateTableDialog
            createDTable={this.onCreateTable}
            onAddDTable={this.onCreateTableToggle}
          />
        )}
      </Fragment>
    );
  }
}

MainPanelDTables.propTypes = propTypes;

export default MainPanelDTables;
