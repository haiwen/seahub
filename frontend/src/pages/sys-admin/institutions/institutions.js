import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { siteRoot, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import SysAdminAddInstitutionDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-institution-dialog';
import Paginator from '../../../components/paginator';

dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getInstitutionsByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getInstitutionsByPage(this.props.currentPage + 1);
  };

  render() {
    const { loading, errorMsg, items, perPage, currentPage, hasNextPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No institutions')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="75%">{gettext('Name')}</th>
                <th width="20%">{gettext('Created At')}</th>
                <th width="5%">{/* Operations */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  deleteInstitution={this.props.deleteInstitution}
                />);
              })}
            </tbody>
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={perPage}
            resetPerPage={this.props.resetPerPage}
          />
        </Fragment>
      );
      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  getLogsByPage: PropTypes.func,
  resetPerPage: PropTypes.func,
  currentPage: PropTypes.number,
  perPage: PropTypes.number,
  pageInfo: PropTypes.object,
  hasNextPage: PropTypes.bool,
  getInstitutionsByPage: PropTypes.func.isRequired,
  deleteInstitution: PropTypes.func.isRequired,
};


class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false,
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  deleteInstitution = () => {
    this.props.deleteInstitution(this.props.item.id);
  };

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen, isHighlighted } = this.state;

    const institutionName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    const deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', institutionName);

    return (
      <Fragment>
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <td><Link to={`${siteRoot}sys/institutions/${item.id}/info/`}>{item.name}</Link></td>
          <td>{dayjs(item.ctime).fromNow()}</td>
          <td>
            <i
              className={`op-icon sf3-font-delete1 sf3-font ${isOpIconShown ? '' : 'invisible'}`}
              title={gettext('Delete')}
              onClick={this.toggleDeleteDialog}
            >
            </i>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Institution')}
            message={deleteDialogMsg}
            executeOperation={this.deleteInstitution}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteDialog}
          />
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  deleteInstitution: PropTypes.func.isRequired,
};

class Institutions extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      institutionList: [],
      perPage: 100,
      currentPage: 1,
      hasNextPage: false,
      isAddInstitutionDialogOpen: false,
    };
    this.initPage = 1;
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getInstitutionsByPage(this.state.currentPage);
    });
  }

  getInstitutionsByPage = (page) => {
    let { perPage } = this.state;
    systemAdminAPI.sysAdminListInstitutions(page, perPage).then((res) => {
      this.setState({
        loading: false,
        institutionList: res.data.institution_list,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getInstitutionsByPage(this.initPage));
  };

  toggleAddInstitutionDialog = () => {
    this.setState({ isAddInstitutionDialogOpen: !this.state.isAddInstitutionDialogOpen });
  };

  addInstitution = (name) => {
    systemAdminAPI.sysAdminAddInstitution(name).then(res => {
      let institutionList = this.state.institutionList;
      institutionList.push(res.data);
      this.setState({ institutionList: institutionList });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteInstitution = (institutionID) => {
    systemAdminAPI.sysAdminDeleteInstitution(institutionID).then(res => {
      let institutionList = this.state.institutionList.filter(inst => {
        return inst.id != institutionID;
      });
      this.setState({ institutionList: institutionList });
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { isAddInstitutionDialogOpen, hasNextPage, currentPage, perPage } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddInstitutionDialog}>{gettext('Add Institution')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Institutions')}</h3>
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.institutionList}
                deleteInstitution={this.deleteInstitution}
                currentPage={currentPage}
                perPage={perPage}
                hasNextPage={hasNextPage}
                getInstitutionsByPage={this.getInstitutionsByPage}
                resetPerPage={this.resetPerPage}
              />
            </div>
          </div>
        </div>
        {isAddInstitutionDialogOpen &&
          <SysAdminAddInstitutionDialog
            addInstitution={this.addInstitution}
            toggle={this.toggleAddInstitutionDialog}
          />
        }
      </Fragment>
    );
  }
}

export default Institutions;
