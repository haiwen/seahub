import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { username } from '../../utils/constants';
import WikiCardGroup from './wiki-card-group';
import './wiki-card-view.css';

const propTypes = {
  data: PropTypes.object.isRequired,
  deleteWiki: PropTypes.func.isRequired,
};

class WikiCardView extends Component {

  classifyWikis = (wikis) => {
    let myWikis = [];
    let department2WikisMap = {};
    for (let i = 0; i < wikis.length; i++) {
      if (wikis[i].owner === username) {
        myWikis.push(wikis[i]);
        continue;
      }
      if (!department2WikisMap[wikis[i].owner]) {
        department2WikisMap[wikis[i].owner] = [];
      }
      department2WikisMap[wikis[i].owner].push(wikis[i]);
    }
    return { department2WikisMap, myWikis };
  };

  render() {
    let { loading, errorMsg, wikis } = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }
    const { myWikis, department2WikisMap } = this.classifyWikis(wikis);
    let wikiCardGroups = [];
    wikiCardGroups.push(
      <WikiCardGroup
        deleteWiki={this.props.deleteWiki}
        wikis={myWikis}
        owner={username}
      />
    );
    for (let key in department2WikisMap) {
      wikiCardGroups.push(
        <WikiCardGroup
          deleteWiki={this.props.deleteWiki}
          wikis={department2WikisMap[key]}
          owner={key}
        />
      );
    }
    return wikiCardGroups;
  }
}

WikiCardView.propTypes = propTypes;

export default WikiCardView;
