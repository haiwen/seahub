import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import FilesActivities from './components/FilesActivities';
import SideNav from './components/SideNav';
import Header from './components/Header'

class DashBoard extends Component {
  render() {
    return (
      <div>
       <Header />
       <div id="main" className="container-fluid w100 flex-auto d-flex ovhd">
        <div className='row flex-1 d-flex w100 ovhd'>
         <SideNav />
         <div id="right-panel" className="col-md-9 ov-auto flex-1">
           <FilesActivities />
         </div>
        </div>
       </div>
      </div>
    )
  }
}

ReactDOM.render (
  <DashBoard />,
  document.getElementById('wrapper')
)
