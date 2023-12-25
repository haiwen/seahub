import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import toaster from '../toast';
import Loading from '../loading';
import Icon from '../icon';
import { Utils } from '../../utils/utils';
import { SEARCH_DELAY_TIME, getValueLength } from './constant';
import AISearchRefrences from './ai-search-widgets/ai-search-refrences';
import AISearchHelp from './ai-search-widgets/ai-search-help';
import AISearchRobot from './ai-search-widgets/ai-search-robot';

import './ai-search-ask.css';

const INDEX_STATE = {
  RUNNING: 'running',
  UNCREATED: 'uncreated',
  FINISHED: 'finished'
};

export default class AISearchAsk extends Component {

  static propTypes = {
    value: PropTypes.string,
    token: PropTypes.string,
    repoID: PropTypes.string,
    repoName: PropTypes.string,
    indexState: PropTypes.string,
    onItemClickHandler: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      value: props.value,
      isLoading: false,
      answeringResult: '',
      hitFiles: [],
    };
    this.timer = null;
    this.isChineseInput = false;
  }

  componentDidMount() {
    document.addEventListener('compositionstart', this.onCompositionStart);
    document.addEventListener('compositionend', this.onCompositionEnd);
    this.onSearch();
  }

  componentWillUnmount() {
    document.removeEventListener('compositionstart', this.onCompositionStart);
    document.removeEventListener('compositionend', this.onCompositionEnd);
    this.isChineseInput = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  onCompositionStart = () => {
    this.isChineseInput = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  onCompositionEnd = () => {
    this.isChineseInput = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.timer = setTimeout(() => {
      this.onSearch();
    }, SEARCH_DELAY_TIME);
  };

  onChange = (event) => {
    const newValue = event.target.value;
    this.setState({ value: newValue }, () => {
      if (!this.isChineseInput) {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        this.timer = setTimeout(() => {
          this.onSearch();
        }, SEARCH_DELAY_TIME);
      }
    });
  };

  onKeydown = (event) => {
    if (isHotkey('enter', event)) {
      this.onSearch();
    }
  };

  formatQuestionAnsweringItems(data) {
    let items = [];
    for (let i = 0; i < data.length; i++) {
      items[i] = {};
      items[i]['index'] = [i];
      items[i]['name'] = data[i].substring(data[i].lastIndexOf('/')+1);
      items[i]['path'] = data[i];
      items[i]['repo_id'] = this.props.repoID;
      items[i]['is_dir'] = false;
      items[i]['link_content'] = decodeURI(data[i]).substring(1);
      items[i]['content'] = data[i].sentence;
      items[i]['thumbnail_url'] = '';
    }
    return items;
  }

  onSearch = () => {
    const { indexState, repoID, token } = this.props;
    if (indexState === INDEX_STATE.UNCREATED) {
      toaster.warning(gettext('Please create index first.'));
      return;
    }
    if (indexState === INDEX_STATE.RUNNING) {
      toaster.warning(gettext('Indexing, please try again later.'));
      return;
    }
    if (this.state.isLoading || getValueLength(this.state.value.trim()) < 3) {
      return;
    }
    this.setState({ isLoading: true });
    const searchParams = {
      q: this.state.value.trim(),
      search_repo: repoID || 'all',
    };
    seafileAPI.questionAnsweringFiles(searchParams, token).then(res => {
      const { answering_result } = res.data || {};
      const hit_files = answering_result !== 'false' ? res.data.hit_files : [];
      this.setState({
        isLoading: false,
        answeringResult: answering_result === 'false' ? 'No result' : answering_result,
        hitFiles: this.formatQuestionAnsweringItems(hit_files),
      });
    }).catch(error => {
      /* eslint-disable */
      console.log(error);
      this.setState({ isLoading: false });
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    return (
      <div className="search">
        <div className="search-mask show" onClick={this.props.closeAsk}></div>
        <div className="ai-search-ask search-container show p-0">

          <div className="ai-search-ask-header">
            <span className="ai-search-ask-return" onClick={this.props.closeAsk}>
              <Icon symbol='arrow' />
            </span>
            {gettext('Return')}
          </div>        

          {this.state.isLoading ?
            <div className="d-flex align-items-center my-8">
              <Loading />
            </div>
          :
          <div className="ai-search-ask-body p-6 pb-4">
            <div className="ai-search-ask-body-left">
              <AISearchRobot/>
            </div>
            <div className="ai-search-ask-body-right">
              {/* <div>{this.state.answeringResult}</div>s */}

              {/* markdown viewer */}
              <div className="ai-search-ask-body-markdown">
              <MarkdownViewer
                value={this.state.answeringResult}
                isShowOutline={false}
              />
              </div>

              <AISearchHelp />
              {this.state.hitFiles.length > 0 &&
                <AISearchRefrences
                  hitFiles={this.state.hitFiles}
                  onItemClickHandler={this.props.onItemClickHandler}
                />
              }
            </div>
          </div>
          }

          <div className="ai-search-ask-footer">
            <div className={`input-icon mb-1`}>
              <input
                type="text"
                className="form-control search-input w-100"
                name="query"
                value={this.state.value}
                onChange={this.onChange}
                autoComplete="off"
                onKeyDown={this.onKeydown}
                placeholder={gettext('Ask a question') + '...'}
              />
              <span className="ai-search-ask-footer-btn" onClick={this.onSearch}>
                <Icon symbol='send' />
                </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
