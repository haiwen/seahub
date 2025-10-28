import React, { useEffect, useState } from 'react';
import './index.css';

const { repoID, viewID, } = window.app.pageOptions;

export default function WikiRepoView() {

  const [metadata, setMetaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

  }, []);

  return (
    <div className='wiki-repo-view'>
      <div className='wiki-repo-view-header'>
        WikiRepoView
      </div>
      <div className='wiki-repo-view-content'></div>
    </div>
  );
}
