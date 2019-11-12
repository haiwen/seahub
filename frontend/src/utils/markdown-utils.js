const hrefReg = /\[.+\]\(\S+\)|<img src=(\S+).+\/>|!\[\]\(\S+\)|<\S+>/g,
  imageReg1 = /^<img src="(\S+)" .+\/>/,
  imageReg2 = /^!\[\]\((\S+)\)/,
  linkReg1 = /^\[.+\]\(\S+\)/,
  linkReg2 = /^<\S+>$/;

const getLinks = (hrefs) => {
  const hrefObj = {
    links: [],
    images: []
  };
  hrefs.forEach((href) => {
    if (href.search(linkReg1) >= 0 || href.search(linkReg2) >= 0) {
      hrefObj.links.push(href);
    } else {
      let imageSrcs = href.match(imageReg1);
      let imageSrcs1 = href.match(imageReg2);
      if (imageSrcs) {
        hrefObj.images.push(imageSrcs[1]);
      } else if (imageSrcs1) {
        hrefObj.images.push(imageSrcs1[1]);
      }
    }
  });
  return hrefObj;
};


const getPreviewContent = (markdownContent) => {
  let previewText = '';
  let newMarkdownContent = markdownContent.replace(hrefReg, '');
  for (let index = 0; index < newMarkdownContent.length; index++) {
    if (newMarkdownContent[index] === '#') {
      continue;
    } else if (newMarkdownContent[index] === '\n') {
      previewText += ' ';
    } else {
      previewText += newMarkdownContent[index];
    }
    if (previewText.length === 30) {
      break;
    }
  }

  const hrefs = markdownContent.match(hrefReg);
  if (hrefs) {
    const { images, links } = getLinks(hrefs);
    return { previewText, images, links };
  }
  return { previewText, images: [], links: [] };
};


export default getPreviewContent;