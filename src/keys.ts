/**
 * Temporary key storage until we migrat to domain based system
 */

let PUBLIC_KEYS: { [t: string]: string } = {};
PUBLIC_KEYS[
  'test'
] = `04b90fb62312ffdc6586d94736fb31abbb5fc1c2bcd26191417a2ca48657651b6c360d783f15a76d02a079934ae38e16e93e248fa9a5634488b0ddcd73a5bbdf3f`;
PUBLIC_KEYS['test1'] = PUBLIC_KEYS['test'];
export default PUBLIC_KEYS;
