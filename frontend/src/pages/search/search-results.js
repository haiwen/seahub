import React from 'react';
import {siteRoot, gettext} from '../../utils/constants';
import PropTypes from 'prop-types';
import {Utils} from '../../utils/utils';
import moment from 'moment';

class SearchViewResultsItem extends React.Component {

  constructor(props) {
    super(props);
  }

  handlerFileURL= (item) => {
    return item.is_dir ?
      siteRoot + 'library/' + item.repo_id + '/' + item.repo_name + item.fullpath :
      siteRoot + 'lib/' + item.repo_id + '/file' + Utils.encodePath(item.fullpath);
  };

  handlerParentDirPath= (item) => {
    let index = item.is_dir ?
      item.fullpath.length - item.name.length - 1 :
      item.fullpath.length - item.name.length;
    return item.fullpath.substring(0, index);
  };

  handlerParentDirURL= (item) => {
    return siteRoot + 'library/' + item.repo_id + '/' + item.repo_name + item.parent_dir;
  };

  render() {
    let item = this.props.item;
    item['link_content'] = decodeURI(item.fullpath).substring(1);
    item['parent_dir'] = this.handlerParentDirPath(item);
    let className = item.link_content ? 'item-img' : 'lib-item-img';
    let folderIconUrl = item.link_content ? Utils.getFolderIconUrl(false, 192) : Utils.getDefaultLibIconUrl(true);
    let fileIconUrl = item.is_dir ? folderIconUrl : Utils.getFileIconUrl(item.name, 192);

    return (
      <li className="search-result-item" onClick={this.onClickHandler}>
        <img className={className} src={fileIconUrl} alt=""/>
        <div className="item-content">
          <div className="item-name ellipsis">
            <a href={this.handlerFileURL(item)} target="_blank" title={item.name}>{item.name}</a>
          </div>
          <div className="item-link ellipsis">
            <a href={this.handlerParentDirURL(item)} target="_blank" >{item.repo_name}{item.parent_dir}</a>
          </div>
          <div
            className="item-link ellipsis">{Utils.bytesToSize(item.size) + ' ' + moment(item.last_modified * 1000).format('YYYY-MM-DD')}</div>
          <div className="item-text ellipsis" dangerouslySetInnerHTML={{__html: item.content_highlight}}></div>
        </div>
      </li>
    );
  }
}

const searchViewResultsItemPropTypes = {
  item: PropTypes.object.isRequired,
};

SearchViewResultsItem.propTypes = searchViewResultsItemPropTypes;

class SearchViewResultsList extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="search-result-container position-static">
        <ul className="search-result-list">
          <p className="tip">{this.props.total + ' ' + gettext('results')}</p>
          {this.props.resultItems.map((item, index) => {
            return (
              <SearchViewResultsItem
                key={index}
                item={item}
              />
            );
          })}
        </ul>
      </div>
    );
  }
}

const searchViewResultsListPropTypes = {
  resultItems: PropTypes.array.isRequired,
  total: PropTypes.number.isRequired,
};

SearchViewResultsList.propTypes = searchViewResultsListPropTypes;

export default SearchViewResultsList;
