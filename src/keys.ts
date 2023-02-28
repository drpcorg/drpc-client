/**
 * Temporary key storage until we migrat to domain based system
 */

// Convert base64 to hex:
// openssl ec -pubin -in ./src/key -text

export type DrpcProviders =
  | 'p2p-01'
  | 'attestant'
  | 'p-ops'
  | 'stakesquid'
  | 'test';

let PUBLIC_KEYS: { [key in DrpcProviders]: string } = {
  'p2p-01':
    '0445763ed8e33e86b9270db41bcff900717e55b08d69c5435fb1ce7ae4e9b26372cd6a304403120027a383877ebc3fd00ae9f12adfdcef0e05c14f8b3c6c9a7be5',
  attestant:
    '04baaf702a61308ecfbaf30e25aa1163d823f51edad0441698a866138d8e6bd808d69bef73ed58ec7181d66915606da8634568b4dfa5ac0533094e4d13e43951a2',
  'p-ops':
    '0452c2216dac3ab4706a892760279d7141293b39fb081948188697d5487a987cb1968ccc300953f5c21bfe4553163b11eff39779392f4ce10f6b05792a7a596006',
  stakesquid:
    '044d40cb6f42e5a62dbf55fef6d137a8936d2fc105205b62a9af396a1d9cf0d0633ea1fbef9e16b7208e648e63858f5da1fe51ae879ef79a3b769d74995f810816',
  test: '04d0326a340b2590e37184a0fe4a3c95b8d4016a7196db46591ceb085adb203d062bc8c38758a9d7e38a66d752bd5871c1c005c802724aa6825f75adbca49582c8',
};

export default PUBLIC_KEYS;
