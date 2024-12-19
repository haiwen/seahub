import { addChildAt, removeChildAt } from './utils';
import {
  wrapperClass,
} from './constants';

export function domDropHandler({ element, draggables, layout, options }) {
  return (dropResult, onDrop) => {
    const { removedIndex, addedIndex, droppedElement } = dropResult;
    let removedWrapper = null;
    if (removedIndex !== null) {
      removedWrapper = removeChildAt(element, removedIndex);
      draggables.splice(removedIndex, 1);
    }

    if (addedIndex !== null) {
      const wrapper = window.document.createElement('div');
      wrapper.className = `${wrapperClass}`;
      wrapper.appendChild(removedWrapper && removedWrapper.firstElementChild ? removedWrapper.firstElementChild : droppedElement);
      addChildAt(element, wrapper, addedIndex);
      if (addedIndex >= draggables.length) {
        draggables.push(wrapper);
      } else {
        draggables.splice(addedIndex, 0, wrapper);
      }
    }

    if (onDrop) {
      onDrop(dropResult);
    }
  };
}

export function reactDropHandler() {
  const handler = () => {
    return (dropResult, onDrop) => {
      if (onDrop) {
        onDrop(dropResult);
      }
    };
  };

  return {
    handler
  };
}
