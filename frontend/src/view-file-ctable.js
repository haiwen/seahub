import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import AppHeader from './pages/data-grid/app-header';
import AppMain from './pages/data-grid/app-main';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';
import toaster from './components/toast';

import './css/layout.css';
import './css/file-view-data-grid.css';
import './css/react-context-menu.css';

const { workspaceID, fileName, filePath } = window.app.pageOptions;

class ViewFileSDB extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isContentChanged: false,
    };
  }

  onContentChanged = () => {
    this.setState({isContentChanged: true});
  }

  onSave = () => {
    this.setState({isContentChanged: false});

    let data = this.refs.data_grid.serializeGridData();

    seafileAPI.getTableUpdateLink(workspaceID).then(res => {
      let updateLink = res.data;
      seafileAPI.updateFile(updateLink, filePath, fileName, JSON.stringify(data)).then(res => {
        toaster.success(gettext('File saved.'));
      }).catch(() => {
        toaster.success(gettext('File save failed.'));
      });
    });
  }

  render() {
    return (
      <Fragment>
        <AppHeader onSave={this.onSave} isContentChanged={this.state.isContentChanged} />
        <AppMain ref="data_grid" onContentChanged={this.onContentChanged} onSave={this.onSave} />
      </Fragment>
    );
  }
}

ReactDOM.render(
  <ViewFileSDB />,
  document.getElementById('wrapper')
);