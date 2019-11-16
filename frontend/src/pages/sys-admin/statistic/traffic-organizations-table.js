import React, { Fragment } from 'react';
import { Input } from 'reactstrap';
import moment from 'moment';
import { gettext } from '../../../utils/constants';
import TrafficTable from './traffic-table';
import TrafficTableBody from './traffic-table-body';
import { seafileAPI } from '../../../utils/seafile-api';
import Paginator from '../../../components/paginator';
import Loading from '../../../components/loading';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';

class TrafficOrganizationsTable extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      userTrafficList: [],
      perPage: 100,
      currentPage: 1,
      hasNextPage: false,
      month: moment().format('YYYYMM'),
      isLoading: false,
      errorMessage: '',
      sortOrder: 'asc'
    };
    this.initPage = 1;
    this.initMonth = moment().format('YYYYMM');
  }

  componentDidMount() {
    this.onGenerateReports(this.initMonth, this.initPage);
  }

  getPreviousPage = () => {
    this.onGenerateReports(this.state.currentPage - 1);
  }

  getNextPage = () => {
    this.onGenerateReports(this.state.currentPage + 1);
  }

  handleChange = (e) => {
    let month = e.target.value;
    this.setState({
      month: month
    });
  }

  handleKeyPress = (e) => {
    let { month } = this.state;
    if (e.key === 'Enter') {
      let pattern = /^([012]\d{3})(0[1-9]|1[012])$/;
      if (!pattern.test(month)) {
        let errorMessage = gettext('Invalid month, should be yyyymm.');
        this.setState({
          errorMessage: errorMessage
        });
        return;
      }
      this.onGenerateReports(month, this.initPage);
      e.target.blur();
      e.preventDefault();
    }
  }

  sortBySize = (sortByType, sortOrder) => {
    let { userTrafficList } = this.state;
    let newUserTrafficList = Utils.sortTraffic(userTrafficList, sortByType, sortOrder);
    this.setState({
      userTrafficList: newUserTrafficList,
      sortOrder: sortOrder
    });
  }

  onGenerateReports = (month, page) => {
    let { perPage } = this.state;
    this.setState({isLoading: true, errorMessage: ''});
    seafileAPI.sysAdminListOrgTraffic(month, page, perPage).then(res => {
      let userTrafficList = res.data.org_monthly_traffic_list.slice(0);
      this.setState({
        userTrafficList: userTrafficList,
        hasNextPage: res.data.has_next_page,
        isLoading: false
      });
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.onGenerateReports(this.initPage, this.initMonth));
  }

  render() {
    let { userTrafficList, currentPage, hasNextPage, perPage, isLoading, errorMessage, sortOrder } = this.state;
    return (
      <Fragment>
        <div className="d-flex align-items-center mt-4">
          <span className="statistic-reports-tip">{gettext('Month:')}</span>
          <Input 
            className="statistic-reports-input" 
            defaultValue={moment().format('YYYYMM')}
            onChange={this.handleChange}
            onKeyPress={this.handleKeyPress}
          />
          {errorMessage && <div className="error">{errorMessage}</div>}
        </div>
        {isLoading && <Loading />}
        {!isLoading && 
          <TrafficTable type={'org'} sortOrder={sortOrder} sortBySize={this.sortBySize} >
            {userTrafficList.length > 0 && userTrafficList.map((item, index) => {
              return(
                <TrafficTableBody 
                  key={index}
                  userTrafficItem={item}
                  type={'org'}
                />
              );
            })}
          </TrafficTable>
        }
        <Paginator 
          gotoPreviousPage={this.getPreviousPage}
          gotoNextPage={this.getNextPage}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          canResetPerPage={true}
          curPerPage={perPage}
          resetPerPage={this.resetPerPage}
        />
      </Fragment>
    );
  }
}

export default TrafficOrganizationsTable;