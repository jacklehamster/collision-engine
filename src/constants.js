const HORIZONTAL = 0;
const VERTICAL = 1;
const DEEP = 2;

/* tslint:disable:no-bitwise */
class Constants {
  static H = 1 << HORIZONTAL;
  static V = 1 << VERTICAL;
  static D = 1 << DEEP;
}
/* tslint:enable:no-bitwise */

module.exports = {
  Constants,
};
