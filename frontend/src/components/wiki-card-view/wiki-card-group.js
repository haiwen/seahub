import React, { Component } from 'react';
import PropTypes from 'prop-types';
import WikiCardItem from './wiki-card-item';
import WikiCardItemAdd from './wiki-card-item-add';
import { isMobile } from '../../utils/utils';

const propTypes = {
  wikis: PropTypes.array.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  isDepartment: PropTypes.bool.isRequired,
  isShowAvatar: PropTypes.bool.isRequired,
  renameWiki: PropTypes.func.isRequired,
  toggelAddWikiDialog: PropTypes.func,
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

  onResize = () => {
    if (isMobile) return;
    const numberOfWiki = Math.floor((window.innerWidth * 0.78 / 180));
    const gridTemplateColumns = (Math.floor((window.innerWidth * 0.78 - (numberOfWiki + 1) * 16) / numberOfWiki) + 'px ').repeat(numberOfWiki);
    if (this.groupItemsRef.current) {
      this.groupItemsRef.current.style.gridTemplateColumns = gridTemplateColumns;
    }
  };

  render() {
    const { wikis, title, isDepartment, toggelAddWikiDialog } = this.props;
    const numberOfWiki = Math.floor((window.innerWidth * 0.78 / 180));
    const grids = (Math.floor((window.innerWidth * 0.78 - (numberOfWiki + 1) * 16) / numberOfWiki) + 'px ').repeat(numberOfWiki);
    return (
      <div className='wiki-card-group mb-4'>
        <h4 className="sf-heading">
          <span className={`sf3-font nav-icon sf3-font-${isDepartment ? 'department' : 'mine'}`} aria-hidden="true"></span>
          {title}
        </h4>
        <div className='wiki-card-group-items' style={{ gridTemplateColumns: isMobile ? '48% 48%' : grids }} ref={this.groupItemsRef}>
          {wikis.map((wiki, index) => {
            return (
              <WikiCardItem
                key={index + wiki.id + wiki.name}
                wiki={wiki}
                deleteWiki={this.props.deleteWiki}
                isDepartment={isDepartment}
                isShowAvatar={this.props.isShowAvatar}
                renameWiki={this.props.renameWiki}
              />
            );
          })}
          {toggelAddWikiDialog &&
            <WikiCardItemAdd toggelAddWikiDialog={toggelAddWikiDialog}/>
          }
        </div>
      </div>
    );
  }
}

WikiCardGroup.propTypes = propTypes;

export default WikiCardGroup;
