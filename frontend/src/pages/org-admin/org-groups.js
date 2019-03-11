import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { siteRoot, gettext } from '../../utils/constants';

class OrgGroups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1
    }
  }

  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.state.page;

    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }
  } 

  render() {
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-path org-user-nav">
           <h3 className="sf-heading">{gettext('All Groups')}</h3>
          </div>
          <div className="cur-view-content">
            <table>
              <thead>
                <tr>
                  <th width="30%">{gettext('Name')}</th>
                  <th width="35%">{gettext('Creator')}</th>
                  <th width="23%">{gettext('Created At')}</th>
                  <th width="12%" className="text-center">{gettext('Operations')}</th>
                </tr>
              </thead>
              <tbody>
              </tbody>
            </table>
            <div className="paginator">
              {this.state.page !=1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext("Previous")}{' | '}</a>}
              {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext("Next")}</a>}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default OrgGroups;
