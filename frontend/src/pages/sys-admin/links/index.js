import React from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import LinksNav from './links-nav';
import { useLocation } from '@gatsbyjs/reach-router';

const Links = ({ children, ...commonProps }) => {
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();

  return (
    <>
      <MainPanelTopbar {...commonProps} />
      <LinksNav currentItem={path} />
      {children}
    </>
  );
};

export default Links;
