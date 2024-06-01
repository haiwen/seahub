import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, username } from '../../utils/constants';
import WikiCardGroup from './wiki-card-group';
import './wiki-card-view.css';

const propTypes = {
  data: PropTypes.object.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  renameWiki: PropTypes.func.isRequired,
};

class WikiCardView extends Component {

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
        wikis={myWikis}
        title={gettext('My Wikis')}
        isDepartment={false}
        isShowAvatar={false}
      />
    );
    for (let key in department2WikisMap) {
      wikiCardGroups.push(
        <WikiCardGroup
          key={'department-Wikis' + key}
          deleteWiki={this.props.deleteWiki}
          renameWiki={this.props.renameWiki}
          wikis={department2WikisMap[key]}
          title={department2WikisMap[key][0].owner_nickname}
          isDepartment={true}
          isShowAvatar={false}
        />
      );
    }
    wikiCardGroups.push(
      <WikiCardGroup
        key='old-Wikis'
        deleteWiki={this.props.deleteWiki}
        renameWiki={this.props.renameWiki}
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
