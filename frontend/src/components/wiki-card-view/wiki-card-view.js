import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, username, canPublishRepo, isPro } from '../../utils/constants';
import WikiCardGroup from './wiki-card-group';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

import './wiki-card-view.css';

const propTypes = {
  data: PropTypes.object.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  renameWiki: PropTypes.func.isRequired,
  toggelAddWikiDialog: PropTypes.func,
  sidePanelRate: PropTypes.number,
};

class WikiCardView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      departmentMap: {},
    };
  }

  componentDidMount() {
    if (!canPublishRepo || !isPro) return;
    let departmentMap = {};
    wikiAPI.listWikiDepartments().then(res => {
      res.data.forEach(item => departmentMap[item.id] = true);
      this.setState({ departmentMap });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  classifyWikis = (wikis) => {
    let v1Wikis = [];
    let myWikis = [];
    let department2WikisMap = {};
    for (let i = 0; i < wikis.length; i++) {
      if (wikis[i].version === 'v1') {
        v1Wikis.push(wikis[i]);
      } else if (wikis[i].owner === username) {
        myWikis.push(wikis[i]);
      } else {
        if (!department2WikisMap[wikis[i].owner]) {
          department2WikisMap[wikis[i].owner] = [];
        }
        department2WikisMap[wikis[i].owner].push(wikis[i]);
      }
    }
    return { department2WikisMap, myWikis, v1Wikis };
  };

  render() {
    let { loading, errorMsg, wikis } = this.props.data;
    const { toggelAddWikiDialog, sidePanelRate } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }
    const { v1Wikis, myWikis, department2WikisMap } = this.classifyWikis(wikis);
    let wikiCardGroups = [];
    wikiCardGroups.push(
      <WikiCardGroup
        key='my-Wikis'
        deleteWiki={this.props.deleteWiki}
        renameWiki={this.props.renameWiki}
        sidePanelRate={sidePanelRate}
        wikis={myWikis}
        title={gettext('My Wikis')}
        isDepartment={false}
        isShowAvatar={false}
        toggelAddWikiDialog={canPublishRepo ? toggelAddWikiDialog.bind(this, null) : null}
      />
    );
    for (let deptID in department2WikisMap) {
      wikiCardGroups.push(
        <WikiCardGroup
          key={'department-Wikis-' + deptID}
          deleteWiki={this.props.deleteWiki}
          renameWiki={this.props.renameWiki}
          sidePanelRate={sidePanelRate}
          wikis={department2WikisMap[deptID]}
          title={department2WikisMap[deptID][0].owner_nickname}
          isDepartment={true}
          isShowAvatar={false}
          toggelAddWikiDialog={(canPublishRepo && this.state.departmentMap[deptID]) ? toggelAddWikiDialog.bind(this, deptID) : null}
        />
      );
    }
    wikiCardGroups.push(
      <WikiCardGroup
        key='old-Wikis'
        deleteWiki={this.props.deleteWiki}
        renameWiki={this.props.renameWiki}
        sidePanelRate={sidePanelRate}
        wikis={v1Wikis}
        title={gettext('Old Wikis')}
        isDepartment={false}
        isShowAvatar={true}
      />
    );
    return wikiCardGroups;
  }
}

WikiCardView.propTypes = propTypes;

export default WikiCardView;
