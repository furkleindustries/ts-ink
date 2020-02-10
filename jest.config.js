module.exports = {
  roots: [
    '<rootDir>/tests',
  ],

  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  testRegex: '(/tests/.*|(\\.|/)(test))\\.ts$',
  moduleFileExtensions: [
    'ts',
    'js',
  ],
};
