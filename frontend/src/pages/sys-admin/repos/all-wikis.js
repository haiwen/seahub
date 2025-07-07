import React, { Component } from 'react';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import Content from './repos';

class AllWikis extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      wikis: [],
      pageInfo: {},
    };
  }

  componentDidMount() {
    this.getWikisByPage(this.props.currentPage);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.currentPage !== this.props.currentPage) {
      this.getWikisByPage(this.props.currentPage);
    }
  }

  getWikisByPage = (page) => {
    const { perPage, sortBy } = this.props;
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

  resetPerPage = (perPage) => {
    this.props.onResetPerPage(perPage);
    this.getWikisByPage(1);
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
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.wikis}
              pageInfo={this.state.pageInfo}
              curPerPage={this.props.perPage}
              getListByPage={this.getWikisByPage}
              resetPerPage={this.resetPerPage}
              onDeleteRepo={this.onDeleteWiki}
              onTransferRepo={this.onTransferWiki}
              isWiki={true}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default AllWikis;
