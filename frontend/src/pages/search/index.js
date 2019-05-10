// Import React!
import React from 'react';
import ReactDOM from 'react-dom';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import Logo from '../../components/logo';
import SearchViewPanel from './main-panel';
import {isPro, gettext, siteRoot} from '../../utils/constants';
import {Utils} from '../../utils/utils';

import '../../css/layout.css';
import '../../css/toolbar.css';
import '../../css/search.css';

const { q, repoName, searchRepo, searchFtypes } = window.search.pageOptions;

class SearchView extends React.Component {
  constructor(props) {
    super(props);
  }

  onSearchedClick = (selectedItem) => {
    let url = selectedItem.is_dir ?
      siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path :
      siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
    let newWindow = window.open('about:blank');
    newWindow.location.href = url;
  };

  handlePermissionDenied = () => {
    window.location = siteRoot;
    return (
      <div className="error mt-6 text-center">
        <span>{gettext('Permission error')}</span>
      </div>
    );
  };

  render() {
    return (
      <div id="main">
        <div className="w-100">
          <div className="main-panel-north border-left-show">
            <Logo/>
            <CommonToolbar onSearchedClick={this.onSearchedClick}/>
          </div>
          <div className="main-panle-south">
            {!isPro && this.handlePermissionDenied()}
            {isPro &&
            <SearchViewPanel
              q={q}
              searchRepo={searchRepo}
              searchFtypes={searchFtypes}
              repoName={repoName}
            />}
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <SearchView/>,
  document.getElementById('wrapper')
);
