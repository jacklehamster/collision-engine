class Marker {
  constructor(collisionData, isTopLeftClose) {
    this.collisionData = collisionData;
    this.isTopLeftClose = isTopLeftClose;
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }

  static compareHorizontal(a, b) {
    return a.x - b.x;
  }

  static compareVertical(a, b) {
    return a.y - b.y;
  }

  static compareDepth(a, b) {
    return a.z - b.z;
  }
}

module.exports = {
  Marker,
};
