/**
 * Temporary key storage until we migrat to domain based system
 */

let PUBLIC_KEYS: { [t: string]: string } = {};
PUBLIC_KEYS[
  'test'
] = `04b90fb62312ffdc6586d94736fb31abbb5fc1c2bcd26191417a2ca48657651b6c360d783f15a76d02a079934ae38e16e93e248fa9a5634488b0ddcd73a5bbdf3f`;
PUBLIC_KEYS['test1'] = PUBLIC_KEYS['test'];
PUBLIC_KEYS['p2p-01'] =
  '0445763ed8e33e86b9270db41bcff900717e55b08d69c5435fb1ce7ae4e9b26372cd6a304403120027a383877ebc3fd00ae9f12adfdcef0e05c14f8b3c6c9a7be5';

export default PUBLIC_KEYS;
