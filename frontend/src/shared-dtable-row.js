import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import AppHeader from './pages/dtable-row-share/app-header';
import AppMain from './pages/dtable-row-share/app-main';

import './css/dtable-share-row.css';

const { rowContent, columns } = window.shared.pageOptions;

class SharedDTableRowView extends React.Component {

  render() {
    
    return (
      <Fragment>
        <AppHeader />
        <AppMain row={JSON.parse(rowContent)['row']} columns={JSON.parse(columns)['columns']}/>
      </Fragment>
    );
  }
  
}

ReactDOM.render(
  <SharedDTableRowView />,
  document.getElementById('wrapper')
);
