import deselectCurrent from 'toggle-selection';

function copy(text) {
  let reselectPrevious, range, selection, mark, success = false;
  try {
    reselectPrevious = deselectCurrent();

    range = document.createRange();
    selection = document.getSelection();

    // 'a' is for 'copy a link to seafile markdown editor'
    mark = document.createElement('a');
    mark.textContent = text;

    document.body.appendChild(mark);

    range.selectNode(mark);
    selection.addRange(range);

    const successful = document.execCommand('copy');
    if (!successful) {
      //console.log('copy command was unsuccessful');
    }
    success = true;
  } catch (err) {
    // console.error('unable to copy using execCommand');
  } finally {
    if (selection) {
      if (typeof selection.removeRange == 'function') {
        selection.removeRange(range);
      } else {
        selection.removeAllRanges();
      }
    }

    if (mark) {
      document.body.removeChild(mark);
    }
    reselectPrevious();
  }

  return success;
}

export default copy;
