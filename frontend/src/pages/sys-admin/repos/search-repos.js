import React, { Component, Fragment } from 'react';
import { Form, FormGroup, Input, Label, Col } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import MainPanelTopbar from '../main-panel-topbar';
import Content from './repos';


class SearchRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      currentPage: 1,
      perPage: 25,
      isSubmitBtnActive: false,
      loading: true,
      errorMsg: '',
      repos: [],
      pageInfo: {},
    };
  }

  componentDidMount() {
    let params = (new URL(document.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      name: params.get('name_or_id') || '',
      perPage: parseInt(params.get('per_page') || perPage),
      currentPage: parseInt(params.get('page') || currentPage),
    }, () => {
      this.getRepos(this.state.currentPage);
    });
  }

  getRepos = (page) => {
    const { name, perPage } = this.state;
    if (this.getValueLength(name) < 3) {
      toaster.notify(gettext('Required at least three letters.'));
      return;
    }
    seafileAPI.sysAdminSearchRepos(name, page, perPage).then((res) => {
      this.setState({
        loading: false,
        errorMsg: '',
        repos: res.data.repo_list,
        pageInfo: res.data.page_info,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  searchRepos = () => {
    const { currentPage } = this.state;
    this.getRepos(currentPage);
  };

  onDeleteRepo = (targetRepo) => {
    let repos = this.state.repos.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      repos: repos
    });
  };

  onTransferRepo = (targetRepo) => {
    let repos = this.state.repos.map((item) => {
      return item.id == targetRepo.id ? targetRepo : item;
    });
    this.setState({
      repos: repos
    });
  };

  handleNameInputChange = (e) => {
    this.setState({
      name: e.target.value,
      currentPage: 1,
    }, this.checkSubmitBtnActive);
  };

  checkSubmitBtnActive = () => {
    const { name } = this.state;
    this.setState({
      isSubmitBtnActive: name.trim()
    });
  };

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      const { isSubmitBtnActive } = this.state;
      if (isSubmitBtnActive) {
        this.searchRepos();
      }
    }
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage,
      currentPage: 1,
    }, () => {
      this.searchRepos();
    });
  };

  getValueLength(str) {
    let code, len = 0;
    for (let i = 0, length = str.length; i < length; i++) {
      code = str.charCodeAt(i);
      if (code === 10) { //solve enter problem
        len += 2;
      } else if (code < 0x007f) {
        len += 1;
      } else if (code >= 0x0080 && code <= 0x07ff) {
        len += 2;
      } else if (code >= 0x0800 && code <= 0xffff) {
        len += 3;
      }
    }
    return len;
  }

  render() {
    const { name, isSubmitBtnActive } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Libraries')}</h3>
            </div>
            <div className="cur-view-content">
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Search Libraries')}</h4>
                <p className="text-secondary small">{gettext('Tip: you can search by keyword in name or ID.')}</p>
                <Form tag={'div'}>
                  <FormGroup row>
                    <Label for="name" sm={1}>{gettext('Name or ID')}</Label>
                    <Col sm={5}>
                      <Input type="text" name="name" id="name" value={name} onChange={this.handleNameInputChange} onKeyDown={this.handleKeyDown} />
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Col sm={{size: 5, offset: 1}}>
                      <button className="btn btn-outline-primary" disabled={!isSubmitBtnActive} onClick={this.searchRepos}>{gettext('Submit')}</button>
                    </Col>
                  </FormGroup>
                </Form>
              </div>
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Result')}</h4>
                <Content
                  loading={this.state.loading}
                  errorMsg={this.state.errorMsg}
                  items={this.state.repos}
                  pageInfo={this.state.pageInfo}
                  curPerPage={this.state.perPage}
                  getListByPage={this.getRepos}
                  resetPerPage={this.resetPerPage}
                  onDeleteRepo={this.onDeleteRepo}
                  onTransferRepo={this.onTransferRepo}
                />
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default SearchRepos;
