import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, username } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import Loading from '../../components/loading';
import CreateTableDialog from '../../components/dialog/create-table-dialog';
import ShareTableItem from './share-table-item';
import Workspace from './workspace';

import '../../css/dtable-page.css';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class DTable extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      shareTableLoading: true,
      errorMsg: '',
      workspaceList: [],
      shareTableList: [],
      isShowAddDTableDialog: false,
      currentWorkspace: null,
    };
  }

  componentDidMount() {
    this.listWorkspaces();
    this.listSharedTables();
  }

  onAddDTable = () => {
    this.setState({ isShowAddDTableDialog: !this.state.isShowAddDTableDialog });
  }

  newDtable = () => {
    if (this.state.currentWorkspace) {
      this.setState({ currentWorkspace: null });
    }
    this.onAddDTable();
  }
  
  setCurrentWorkspace = (currentWorkspace) => {
    this.setState({ currentWorkspace: currentWorkspace });
  }

  createDTable = (tableName, owner) => {
    seafileAPI.createTable(tableName, owner).then(() => {
      this.listWorkspaces();
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
    this.onAddDTable();
  }

  listWorkspaces = () => {
    seafileAPI.listWorkspaces().then((res) => {
      this.setState({
        loading: false,
        workspaceList: res.data.workspace_list,
      });
    }).catch((error) => {
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
    });
  }

  listSharedTables = () => {
    seafileAPI.listSharedTables().then((res) => {
      this.setState({
        shareTableLoading: false,
        shareTableList: res.data.table_list,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          shareTableLoading: false,
          errorMsg: gettext('Error')
        });
      } else {
        this.setState({
          shareTableLoading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  leaveShareTable = (table) => {
    let email = username;
    let tableName = table.name;
    let workspaceID = table.workspace_id;
    seafileAPI.deleteTableShare(workspaceID, tableName, email).then(() => {
      let shareTableList = this.state.shareTableList.filter(table => {
        return table.name !== tableName;
      });
      this.setState({shareTableList: shareTableList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      } else {
        this.setState({
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  renderShareTablePanel = () => {
    return (
      <div className="workspace">
        <div className="table-heading">{gettext('Shared with me')}</div>
        <div className="table-item-container">
          {this.state.shareTableList.map((table, index) => {
            return (
              <ShareTableItem
                key={index}
                table={table}
                leaveShareTable={this.leaveShareTable}
              />
            );
          })}
        </div>
      </div>
    );
  }

  render() {
    const { workspaceList, loading } = this.state;

    let personalWorkspaceList = workspaceList.filter(workspace => {
      return workspace.owner_type === 'Personal';
    });
    personalWorkspaceList = personalWorkspaceList[0];
    let groupWorkspaceList = workspaceList.filter(workspace => {
      return workspace.owner_type === 'Group';
    });

    if (loading) {
      return(<Loading />);
    }

    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
            <div className="operation">
              <Fragment>
                <MediaQuery query="(min-width: 768px)">
                  <Button className="btn btn-secondary operation-item" onClick={this.newDtable}>{gettext('New DTable')}</Button>
                </MediaQuery>
                <MediaQuery query="(max-width: 767.8px)">
                  <Button className="btn btn-secondary operation-item my-1" onClick={this.newDtable}>{gettext('New DTable')}</Button>
                </MediaQuery>
              </Fragment>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container" id="starred">
            <div className="cur-view-path">
              <h3 className="sf-heading">DTable</h3>
            </div>
            <div className="cur-view-content">
              {this.state.errorMsg &&
                <p className="error text-center">{this.state.errorMsg}</p>
              }
              <Workspace
                workspace={personalWorkspaceList}
                onAddDTable={this.onAddDTable}
                setCurrentWorkspace={this.setCurrentWorkspace}
              />
              {(!this.state.shareTableLoading && this.state.shareTableList.length > 0) &&
                this.renderShareTablePanel()
              }
              {
                groupWorkspaceList.map((workspace, index) => {
                  return (
                    <Workspace
                      key={index}
                      workspace={workspace}
                      onAddDTable={this.onAddDTable}
                      setCurrentWorkspace={this.setCurrentWorkspace}
                    />
                  );
                })
              }
              {this.state.isShowAddDTableDialog &&
                <div className="my-2">
                  <CreateTableDialog
                    createDTable={this.createDTable}
                    onAddDTable={this.onAddDTable}
                    currentWorkspace={this.state.currentWorkspace}
                  />
                </div>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

DTable.propTypes = propTypes;

export default DTable;
