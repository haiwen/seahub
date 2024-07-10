import { init } from 'emoji-mart';
import data from '@emoji-mart/data';

// init data for emoji-mart, used in Picker and `getRandomEmoji` method
init({ data });

const generateARandomEmoji = () => {
  const nativeEmojis = Reflect.ownKeys(data.natives);
  const emojiCount = nativeEmojis.length;
  const emoji = nativeEmojis[Math.floor(Math.random() * emojiCount)];
  return emoji;
};

const generateEmojiIcon = (icon) => {
  return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${icon}</text></svg>`;
};

export {
  data,
  generateEmojiIcon,
  generateARandomEmoji,
};
