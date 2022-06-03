import { format } from 'pretty-format';

window.process = {
  stdout: {
    isTTY: false,
  },
  env: {},
};

Promise.all([import('expect'), import('expect/build/matchers')]).then(
  ([mexpect, matchers]) => {
    const expect = mexpect.expect;
    expect.extend({
      toMatchInlineSnapshot(received, ...rest) {
        return matchers.default.default.toEqual.call(
          this,
          format(received, {
            escapeRegex: true,
            indent: 2,
            printFunctionName: false,
          }).replace(/\r\n|\r/g, '\n'),
          ...rest.map((el) => el.trim())
        );
      },
    });

    window.expect = expect;
  }
);
