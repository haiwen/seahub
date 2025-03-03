import React, { Component } from 'react';
import PropTypes from 'prop-types';
import WikiCardItem from './wiki-card-item';
import WikiCardItemAdd from './wiki-card-item-add';
import { isMobile } from '../../utils/utils';
import { SIDE_PANEL_FOLDED_WIDTH } from '../../constants';

const propTypes = {
  wikis: PropTypes.array.isRequired,
  group: PropTypes.object,
  deleteWiki: PropTypes.func.isRequired,
  unshareGroupWiki: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  isDepartment: PropTypes.bool.isRequired,
  isShowAvatar: PropTypes.bool.isRequired,
  renameWiki: PropTypes.func.isRequired,
  convertWiki: PropTypes.func,
  toggleAddWikiDialog: PropTypes.func,
  sidePanelRate: PropTypes.number,
  isSidePanelFolded: PropTypes.bool,
  noItemsTip: PropTypes.string,
};

class WikiCardGroup extends Component {

  constructor(props) {
    super(props);
    this.groupItemsRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  }

  getContainerWidth = () => {
    const { sidePanelRate, isSidePanelFolded } = this.props;
    return isSidePanelFolded ? window.innerWidth - SIDE_PANEL_FOLDED_WIDTH : window.innerWidth * (1 - sidePanelRate);
  };

  onResize = () => {
    if (isMobile) return;
    const containerWidth = this.getContainerWidth();
    const numberOfWiki = Math.floor(containerWidth / 180);
    const gridTemplateColumns = (Math.floor((containerWidth - (numberOfWiki + 1) * 16) / numberOfWiki) + 'px ').repeat(numberOfWiki);
    if (this.groupItemsRef.current) {
      this.groupItemsRef.current.style.gridTemplateColumns = gridTemplateColumns;
    }
  };

  render() {
    const { wikis, title, isDepartment, toggleAddWikiDialog, group, noItemsTip } = this.props;
    const containerWidth = this.getContainerWidth();
    const numberOfWiki = Math.floor(containerWidth / 180);
    const grids = (Math.floor((containerWidth - (numberOfWiki + 1) * 16) / numberOfWiki) + 'px ').repeat(numberOfWiki);
    let isGroup = false;
    let depIcon = false;
    if (group) {
      isGroup = true;
      depIcon = group.owner === 'system admin';
    }
    return (
      <div className='wiki-card-group mb-4'>
        <h4 className="sf-heading">
          <span className={`sf3-font nav-icon sf3-font-${(isDepartment && depIcon) ? 'department' : isDepartment ? 'group' : 'mine'}`} aria-hidden="true"></span>
          {title}
        </h4>
        {(wikis.length === 0 && noItemsTip) &&
          <div className="wiki-card-group-no-tip my-4">{noItemsTip}</div>
        }
        <div className='wiki-card-group-items' style={{ gridTemplateColumns: isMobile ? '48% 48%' : grids }} ref={this.groupItemsRef}>
          {wikis.map((wiki, index) => {
            return (isGroup ?
              <WikiCardItem
                key={index + wiki.id + wiki.name}
                group={group}
                wiki={wiki}
                deleteWiki={this.props.deleteWiki}
                unshareGroupWiki={this.props.unshareGroupWiki}
                isDepartment={isDepartment}
                isShowAvatar={this.props.isShowAvatar}
                renameWiki={this.props.renameWiki}
                convertWiki={this.props.convertWiki}
              />
              :
              <WikiCardItem
                key={index + wiki.id + wiki.name}
                wiki={wiki}
                deleteWiki={this.props.deleteWiki}
                unshareGroupWiki={this.props.unshareGroupWiki}
                isDepartment={isDepartment}
                isShowAvatar={this.props.isShowAvatar}
                renameWiki={this.props.renameWiki}
                convertWiki={this.props.convertWiki}
              />
            );
          })}
          {toggleAddWikiDialog &&
            <WikiCardItemAdd toggleAddWikiDialog={toggleAddWikiDialog}/>
          }
        </div>
      </div>
    );
  }
}

WikiCardGroup.propTypes = propTypes;

export default WikiCardGroup;
