import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import SeafileCodeMirror from './components/seafile-codemirror';
import './css/text-file-view.css';

const { err, fileExt, fileContent } = window.shared.pageOptions;

const FileContent = ({ lineWrapping }) => {
  if (err) {
    return <SharedFileViewTip />;
  }

  return (
    <div className="shared-file-view-body text-file-view">
      <SeafileCodeMirror fileExt={fileExt} value={fileContent} lineWrapping={lineWrapping} />
    </div>
  );
};

const SharedFileViewText = () => {
  let [lineWrapping, setLineWrapping] = useState(localStorage.getItem('sf_txt_file_line_wrapping') === 'true' || false);

  const updateLineWrapping = (newLineWrapping) => {
    setLineWrapping(newLineWrapping);
  };

  return (
    <SharedFileView
      content={<FileContent lineWrapping={lineWrapping}/>}
      updateLineWrapping={updateLineWrapping}
      lineWrapping={lineWrapping}
      canWrapLine={true}
    />
  );
};

const root = createRoot(document.getElementById('wrapper'));
root.render(<SharedFileViewText />);
