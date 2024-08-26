import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../utils/constants';
import MainPanelTopbar from './main-panel-topbar';
import {Button} from "reactstrap";
import ModalPortal from "../../components/modal-portal";
import OrgLogsExportExcelDialog from "../../components/dialog/org-admin-logs-export-excel-dialog";

class OrgLogs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isExportExcelDialogOpen: false,
      logType: 'logadmin',
    }
  }

  toggleExportExcelDialog = () => {
    this.setState({ isExportExcelDialogOpen: !this.state.isExportExcelDialogOpen });
  };
  tabItemClick = (param) => {
    this.setState({
      logType: param
    })
    this.props.tabItemClick(param);
  };

  render() {
    const { isExportExcelDialogOpen, logType } = this.state
    console.log(logType)
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleExportExcelDialog}>{gettext('Export Excel')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path org-user-nav">
              <ul className="nav">
                <li className="nav-item" onClick={() => this.tabItemClick('logadmin')}>
                  <Link
                    className={`nav-link ${this.props.currentTab === 'logadmin' ? 'active' : ''}`}
                    to={siteRoot + 'org/logadmin/'} title={gettext('File Access')}>{gettext('File Access')}
                  </Link>
                </li>
                <li className="nav-item" onClick={() => this.tabItemClick('file-update')}>
                  <Link
                    className={`nav-link ${this.props.currentTab === 'file-update' ? 'active' : ''}`}
                    to={siteRoot + 'org/logadmin/file-update/'} title={gettext('File Update')}>{gettext('File Update')}
                  </Link>
                </li>
                <li className="nav-item" onClick={() => this.tabItemClick('perm-audit')}>
                  <Link
                    className={`nav-link ${this.props.currentTab === 'perm-audit' ? 'active' : ''}`}
                    to={siteRoot + 'org/logadmin/perm-audit/'} title={gettext('Permission')}>{gettext('Permission')}
                  </Link>
                </li>
              </ul>
            </div>
            {this.props.children}
          </div>
        </div>
        {isExportExcelDialogOpen &&
          <ModalPortal>
            <OrgLogsExportExcelDialog
              logType={logType}
              toggle={this.toggleExportExcelDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  tabItemClick: PropTypes.func.isRequired,
  children: PropTypes.any.isRequired,
};

OrgLogs.propTypes = propTypes;

export default OrgLogs;
