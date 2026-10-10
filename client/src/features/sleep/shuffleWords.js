/**
 * Concrete, emotionally neutral, easy-to-picture nouns. Unrelated words stop the
 * mind from building a narrative, which is what the cognitive shuffle relies on.
 */
export const SHUFFLE_WORDS = [
  'acorn', 'anchor', 'apple', 'apron', 'barn', 'basket', 'beach', 'bell', 'bicycle', 'blanket',
  'boat', 'bottle', 'bowl', 'branch', 'bread', 'brick', 'bridge', 'broom', 'bucket', 'button',
  'cabin', 'candle', 'canoe', 'carpet', 'carrot', 'castle', 'chair', 'cherry', 'cloud', 'coconut',
  'compass', 'cottage', 'cup', 'curtain', 'daisy', 'desk', 'dune', 'envelope', 'feather', 'fence',
  'fern', 'field', 'flag', 'flute', 'fountain', 'garden', 'glove', 'grape', 'harbor', 'hammock',
  'hat', 'hill', 'honey', 'island', 'jar', 'kettle', 'kite', 'ladder', 'lake', 'lamp',
  'lantern', 'leaf', 'lemon', 'lighthouse', 'map', 'meadow', 'mitten', 'moss', 'mountain', 'mug',
  'napkin', 'needle', 'oar', 'orchard', 'paddle', 'pebble', 'pencil', 'pillow', 'pinecone', 'plum',
  'pond', 'quilt', 'rain', 'ribbon', 'river', 'rope', 'saddle', 'sail', 'sand', 'scarf',
  'seashell', 'shelf', 'sock', 'spoon', 'stairs', 'stone', 'straw', 'teapot', 'tent', 'thread',
  'tulip', 'umbrella', 'valley', 'vase', 'violin', 'wagon', 'walnut', 'whistle', 'window', 'wool',
];

/** Endless word stream that never repeats until every word has been shown once. */
export function createWordBag(words = SHUFFLE_WORDS) {
  let bag = [];
  let previous = null;
  return () => {
    if (bag.length === 0) {
      bag = [...words];
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag[bag.length - 1] === previous) bag.unshift(bag.pop());
    }
    previous = bag.pop();
    return previous;
  };
}
