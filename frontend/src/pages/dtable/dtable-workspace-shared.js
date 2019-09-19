import React from 'react';
import PropTypes from 'prop-types';
import DtableItemShared from './dtable-item-shared';
import Loading from '../../components/loading';
import { seafileAPI } from '../../utils/seafile-api';

const gettext = window.gettext;
const username = window.app.pageOptions.username;

const propTypes = {
  tableList: PropTypes.array.isRequired,
};

class DtableWorkspaceShared extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDataLoading: true,
      tableList: [],
    };
  }

  componentDidMount() {
    let tableList = this.props.tableList;
    this.setState({
      isDataLoading: false,
      tableList: tableList,
    });
  }

  leaveShareTable = (table) => {
    let email = username;
    let tableName = table.name;
    let workspaceID = table.workspace_id;
    seafileAPI.deleteTableShare(workspaceID, tableName, email).then(() => {
      let tableList = this.state.tableList.filter(table => {
        return table.name !== tableName;
      });
      this.setState({tableList: tableList});
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

  render() {
    if (this.state.isDataLoading) {
      return <Loading />
    }

    if (!this.state.tableList.length) {
      return "";
    }

    return (
      <div className="workspace">
        <div className="table-heading">{gettext('Shared with me')}</div>
        <div className="table-item-container">
          {this.state.tableList.map((table, index) => {
            return (
              <DtableItemShared key={index} table={table} leaveShareTable={this.leaveShareTable} />
            );
          })}
        </div>
      </div>
    );
  }
}

DtableWorkspaceShared.propTypes = propTypes;

export default DtableWorkspaceShared;
