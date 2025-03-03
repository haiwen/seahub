import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, username, canCreateWiki, isPro } from '../../utils/constants';
import WikiCardGroup from './wiki-card-group';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

import './wiki-card-view.css';

const propTypes = {
  data: PropTypes.object.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  renameWiki: PropTypes.func.isRequired,
  leaveSharedWiki: PropTypes.func.isRequired,
  unshareGroupWiki: PropTypes.func.isRequired,
  convertWiki: PropTypes.func.isRequired,
  toggleAddWikiDialog: PropTypes.func,
  sidePanelRate: PropTypes.number,
  isSidePanelFolded: PropTypes.bool,
};

class WikiCardView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      departmentMap: {},
    };
  }

  componentDidMount() {
    if (!canCreateWiki || !isPro) return;
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
    let sharedWikis = [];
    let department2WikisMap = {};
    for (let i = 0; i < wikis.length; i++) {
      if (wikis[i].version === 'v1') {
        v1Wikis.push(wikis[i]);
      } else if (wikis[i].owner === username) {
        myWikis.push(wikis[i]);
      } else if (wikis[i].type === 'shared') {
        sharedWikis.push(wikis[i]);
      } else {
        if (!department2WikisMap[wikis[i].owner]) {
          department2WikisMap[wikis[i].owner] = [];
        }
        department2WikisMap[wikis[i].owner].push(wikis[i]);
      }
    }
    return { department2WikisMap, myWikis, v1Wikis, sharedWikis };
  };


  render() {
    let { loading, errorMsg, wikis, groupWikis } = this.props.data;
    const { toggleAddWikiDialog, sidePanelRate, isSidePanelFolded } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }
    const { v1Wikis, myWikis, sharedWikis } = this.classifyWikis(wikis);
    let wikiCardGroups = [];
    wikiCardGroups.push(
      <WikiCardGroup
        key='my-Wikis'
        deleteWiki={this.props.deleteWiki}
        renameWiki={this.props.renameWiki}
        unshareGroupWiki={this.props.unshareGroupWiki}
        sidePanelRate={sidePanelRate}
        isSidePanelFolded={isSidePanelFolded}
        wikis={myWikis}
        title={gettext('My Wikis')}
        isDepartment={false}
        isShowAvatar={false}
        toggleAddWikiDialog={canCreateWiki ? toggleAddWikiDialog.bind(this, null) : null}
      />
    );
    wikiCardGroups.push(
      <WikiCardGroup
        key='shared-Wikis'
        deleteWiki={this.props.leaveSharedWiki}
        renameWiki={this.props.renameWiki}
        unshareGroupWiki={this.props.unshareGroupWiki}
        wikis={sharedWikis}
        title={gettext('Shared with me')}
        isDepartment={false}
        isShowAvatar={false}
        sidePanelRate={sidePanelRate}
        isSidePanelFolded={isSidePanelFolded}
        toggleAddWikiDialog={null}
      />
    );
    for (let i = 0; i < groupWikis.length; i++) {
      const groupWiki = groupWikis[i];
      if (groupWiki.wiki_info.length !== 0) {
        wikiCardGroups.push(
          <WikiCardGroup
            key={'group-Wikis-' + groupWiki.group_id}
            deleteWiki={this.props.deleteWiki}
            unshareGroupWiki={this.props.unshareGroupWiki}
            renameWiki={this.props.renameWiki}
            sidePanelRate={sidePanelRate}
            isSidePanelFolded={isSidePanelFolded}
            group={groupWiki}
            wikis={groupWiki.wiki_info}
            title={groupWiki.group_name}
            isDepartment={true}
            isShowAvatar={false}
            toggleAddWikiDialog={(canCreateWiki && this.state.departmentMap[groupWiki.group_id]) ? toggleAddWikiDialog.bind(this, groupWiki.group_id) : null}
          />
        );
      }
    }
    if (v1Wikis.length > 0) {
      wikiCardGroups.push(
        <WikiCardGroup
          key='old-Wikis'
          deleteWiki={this.props.deleteWiki}
          renameWiki={this.props.renameWiki}
          unshareGroupWiki={this.props.unshareGroupWiki}
          convertWiki={this.props.convertWiki}
          isSidePanelFolded={isSidePanelFolded}
          sidePanelRate={sidePanelRate}
          wikis={v1Wikis}
          title={gettext('Old Wikis')}
          isDepartment={false}
          isShowAvatar={true}
        />
      );
    }
    return wikiCardGroups;
  }
}

WikiCardView.propTypes = propTypes;

export default WikiCardView;
