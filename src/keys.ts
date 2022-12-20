/**
 * Temporary key storage until we migrat to domain based system
 */

let PUBLIC_KEYS: { [t: string]: string } = {};
PUBLIC_KEYS[
  'test'
] = `04d0326a340b2590e37184a0fe4a3c95b8d4016a7196db46591ceb085adb203d062bc8c38758a9d7e38a66d752bd5871c1c005c802724aa6825f75adbca49582c8`;
PUBLIC_KEYS['test1'] = PUBLIC_KEYS['test'];
PUBLIC_KEYS['p2p-01'] =
  '0445763ed8e33e86b9270db41bcff900717e55b08d69c5435fb1ce7ae4e9b26372cd6a304403120027a383877ebc3fd00ae9f12adfdcef0e05c14f8b3c6c9a7be5';

export default PUBLIC_KEYS;
