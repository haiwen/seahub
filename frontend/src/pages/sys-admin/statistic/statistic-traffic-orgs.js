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

class OrgsTraffic extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      orgTrafficList: [],
      perPage: 25,
      currentPage: 1,
      hasNextPage: false,
      month: moment().format('YYYYMM'),
      isLoading: false,
      errorMessage: '',
      sortBy: 'link_file_download',
      sortOrder: 'desc'
    };
    this.initPage = 1;
    this.initMonth = moment().format('YYYYMM');
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getTrafficList(this.initMonth, this.state.currentPage);
    });
  }

  getPreviousPage = () => {
    this.getTrafficList(this.state.month, this.state.currentPage - 1);
  }

  getNextPage = () => {
    this.getTrafficList(this.state.month, this.state.currentPage + 1);
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
      this.getTrafficList(month, this.initPage);
      e.target.blur();
      e.preventDefault();
    }
  }

  getTrafficList = (month, page) => {
    const { perPage, sortBy, sortOrder } = this.state;
    const orderBy = sortOrder == 'asc' ? sortBy : `${sortBy}_${sortOrder}`;
    this.setState({isLoading: true, errorMessage: ''});
    seafileAPI.sysAdminListOrgTraffic(month, page, perPage, orderBy).then(res => {
      let orgTrafficList = res.data.org_monthly_traffic_list.slice(0);
      this.setState({
        month: month,
        currentPage: page,
        orgTrafficList: orgTrafficList,
        hasNextPage: res.data.has_next_page,
        isLoading: false
      });
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  sortItems = (sortBy) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: this.state.sortOrder == 'asc' ? 'desc' : 'asc'
    }, () => {
      const { month, currentPage } = this.state;
      this.getTrafficList(month, currentPage);
    });
  }

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getTrafficList(this.initPage, this.initMonth));
  }

  render() {
    const {
      isLoading, errorMessage, orgTrafficList,
      currentPage, hasNextPage, perPage,
      sortBy, sortOrder
    } = this.state;
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
          <TrafficTable type={'org'} sortItems={this.sortItems} sortBy={sortBy} sortOrder={sortOrder}>
            {orgTrafficList.length > 0 && orgTrafficList.map((item, index) => {
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
          curPerPage={perPage}
          resetPerPage={this.resetPerPage}
        />
      </Fragment>
    );
  }
}

export default OrgsTraffic;
