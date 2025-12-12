import React from 'react';
import { useDragLayer } from 'react-dnd';
import CustomIcon from '../../custom-icon';
import NavItemIcon from '../../common/nav-item-icon';
import Icon from '../../../../components/icon';
import PropTypes from 'prop-types';

const PageDragLayer = ({ pages, getFoldState }) => {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !item || !currentOffset) {
    return null;
  }

  const renderPageTree = (pageNode, depth = 0) => {
    if (!pageNode) return null;

    const pageData = pages.find(p => p.id === pageNode.id);
    if (!pageData) return null;

    const page = { ...pageData, children: pageNode.children };

    const childNumber = Array.isArray(page.children) ? page.children.length : 0;
    const customIcon = page.icon;
    const hasChildren = childNumber > 0;
    const isFolded = getFoldState ? getFoldState(page.id) : false;

    return (
      <div key={page.id} className="wiki-page-item-wrapper" style={{ '--depth': depth }}>
        <div className="wiki-page-item">
          <div className="wiki-page-item-main">
            <div className="wiki-page-content">
              {!hasChildren && (customIcon ? (
                <CustomIcon icon={customIcon} />
              ) : (
                <NavItemIcon symbol={'file'} disable={true} />
              ))}
              {hasChildren && (
                <div className="wiki-nav-item-icon">
                  <Icon
                    symbol="down"
                    className={isFolded ? 'rotate-270' : ''}
                    aria-hidden="true"
                  />
                </div>
              )}
              {hasChildren && (customIcon ? (
                <CustomIcon icon={customIcon} />
              ) : (
                <NavItemIcon symbol={'files'} disable={true} />
              ))}
              <span className="wiki-page-title text-truncate">{page.name}</span>
            </div>
          </div>
        </div>
        {hasChildren && !isFolded && (
          <div className="page-children">
            {page.children.map((childNode, index) => renderPageTree(childNode, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const { x, y } = currentOffset;

  return (
    <div className="wiki-page-drag-layer">
      <div
        className="wiki-drag-ghost-wrapper"
        style={{
          left: x,
          top: y,
        }}
      >
        {renderPageTree(item.data, 0)}
      </div>
    </div>
  );
};

PageDragLayer.propTypes = {
  pages: PropTypes.array.isRequired,
  getFoldState: PropTypes.func,
};

export default PageDragLayer;
