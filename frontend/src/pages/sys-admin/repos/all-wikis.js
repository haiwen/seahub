import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import MainPanelTopbar from '../main-panel-topbar';
import ReposNav from './repos-nav';
import Content from './repos';

class AllWikis extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      wikis: [],
      pageInfo: {},
      perPage: 100,
      sortBy: '',
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage = 1, perPage, sortBy } = this.state;
    this.setState({
      sortBy: urlParams.get('order_by') || sortBy,
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getWikisByPage(this.state.currentPage);
    });
  }

  getWikisByPage = (page) => {
    const { perPage, sortBy } = this.state;
    systemAdminAPI.sysAdminListAllWikis(page, perPage, sortBy).then((res) => {
      this.setState({
        loading: false,
        wikis: res.data.wikis,
        pageInfo: res.data.page_info
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  sortItems = (sortBy) => {
    this.setState({
      currentPage: 1,
      sortBy: sortBy
    }, () => {
      let url = new URL(location.href);
      let searchParams = new URLSearchParams(url.search);
      const { currentPage, sortBy } = this.state;
      searchParams.set('page', currentPage);
      searchParams.set('order_by', sortBy);
      url.search = searchParams.toString();
      navigate(url.toString());
      this.getWikisByPage(currentPage);
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getWikisByPage(1);
    });
  };

  onDeleteWiki = (targetRepo) => {
    let wikis = this.state.wikis.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      wikis: wikis
    });
  };

  onTransferWiki = (targetRepo) => {
    let wikis = this.state.wikis.map((item) => {
      return item.id == targetRepo.id ? targetRepo : item;
    });
    this.setState({
      wikis: wikis
    });
  };

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav
              currentItem="wikis"
              sortBy={this.state.sortBy}
              sortItems={this.sortItems}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.wikis}
                pageInfo={this.state.pageInfo}
                curPerPage={this.state.perPage}
                getListByPage={this.getWikisByPage}
                resetPerPage={this.resetPerPage}
                onDeleteRepo={this.onDeleteWiki}
                onTransferRepo={this.onTransferWiki}
                isWiki={true}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default AllWikis;
