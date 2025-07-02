import React, { useEffect, useState } from 'react';
import { useLocation, navigate } from '@gatsbyjs/reach-router';
import MainPanelTopbar from '../main-panel-topbar';
import LinksNav from './links-nav';
import ShareLinks from './share-links';
import UploadLinks from './upload-links';

const Links = ({ children, ...commonProps }) => {
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [perPage, setPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();

  const sortItems = (sortBy, sortOrder) => {
    setSortBy(sortBy);
    setSortOrder(sortOrder);
    setCurrentPage(1);
    const url = new URL(location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set('page', 1);
    searchParams.set('order_by', sortBy);
    searchParams.set('direction', sortOrder);
    url.search = searchParams.toString();
    navigate(url.toString());
  };

  const onResetPerPage = (perPage) => {
    setPerPage(perPage);
  };

  useEffect(() => {
    const urlParams = (new URL(window.location)).searchParams;
    setSortBy(urlParams.get('order_by') || sortBy);
    setSortOrder(urlParams.get('direction') || sortOrder);
    setPerPage(parseInt(urlParams.get('per_page') || perPage));
    setCurrentPage(parseInt(urlParams.get('page') || currentPage));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <MainPanelTopbar {...commonProps} />
      <LinksNav currentItem={path} sortBy={sortBy} sortOrder={sortOrder} sortItems={sortItems} />
      <ShareLinks path="share" onResetPerPage={onResetPerPage} />
      <UploadLinks path="upload" />
    </>
  );
};

export default Links;
