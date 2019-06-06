import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import AppHeader from '@seafile/dtable/src/components/app-header';
import AppMain from '@seafile/dtable/src/components/app-main';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';
import toaster from './components/toast';
import Loading from './components/loading';

import './css/common.css';
import './css/layout.css';
import './css/file-view-data-grid.css';
import './css/react-context-menu.css';

const { workspaceID, repoID, fileName, filePath } = window.app.pageOptions;

const DEFAULT_DATA = {
  columns:  [
    {
      key: 'name',
      name: 'Name',
      type: '',
      width: 80,
      editable: true,
      resizable: true
    }
  ],
  rows:  [{name: 'name_' + 0}]
}

class ViewFileSDB extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isContentChanged: false,
      isSaveing: false,
      isLoading: true,
      ctableData: JSON.stringify(DEFAULT_DATA)
    };
  }

  componentDidMount() {
    window.onbeforeunload = () => {
      if (this.state.isContentChanged) {
        return 'The data in the form is not saved, are you sure to quit?';
      } else {
        return null;
      }
    };
    this.getCTable();
  }

  componentWillUnmount() {
    window.onbeforeunload = () => {
      return null;
    };
  }

  getCTable = () => {
    seafileAPI.getTableDownloadLink(workspaceID, fileName).then(res => {
      let url = res.data;
      seafileAPI.getFileContent(url).then(res => {
        if (res.data) {
          this.setState({
            ctableData: res.data,
            isLoading: false
          });
        }
      }).catch((err) => {
        this.setState({ isLoading: false });
      })
    });
  }

  onContentChanged = () => {
    this.setState({isContentChanged: true});
  }

  onSave = () => {
    this.setState({
      isContentChanged: false,
      isSaveing: true,
    });

    let data = this.refs.data_grid.serializeGridData();

    seafileAPI.getTableUpdateLink(workspaceID).then(res => {
      let updateLink = res.data;
      seafileAPI.updateFile(updateLink, filePath, fileName, JSON.stringify(data)).then(res => {
        this.setState({isSaveing: false});
        toaster.success(gettext('File saved.'));
      }).catch(() => {
        toaster.success(gettext('File save failed.'));
      });
    });
  }

  render() {
    return (
      <Fragment>
        <AppHeader onSave={this.onSave} isContentChanged={this.state.isContentChanged} isSaveing={this.state.isSaveing} />
        {this.state.isLoading ? <Loading/> :
          <AppMain ref="data_grid" onContentChanged={this.onContentChanged} onSave={this.onSave} ctableData={this.state.ctableData}/>
        }
      </Fragment>
    );
  }
}

ReactDOM.render(
  <ViewFileSDB />,
  document.getElementById('wrapper')
);