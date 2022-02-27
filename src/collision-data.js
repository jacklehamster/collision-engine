const { Marker } = require('./marker');

class CollisionData {
  constructor(body, { onCollide, onLeave, onEnter }) {
    this.body = body;
    this.collisions = new Map();
    this.overlapping = new Map();
    this.topLeftClose = new Marker(this, true);
    this.bottomRightFar = new Marker(this, false);
    this.callbacks =
      onCollide || onLeave || onEnter
        ? {
            onCollide,
            onLeave,
            onEnter,
          }
        : null;
  }

  shouldCountCollision() {
    return this.callbacks;
  }

  get left() {
    return this.topLeftClose.x;
  }

  get top() {
    return this.topLeftClose.y;
  }

  get close() {
    return this.topLeftClose.z;
  }

  get right() {
    return this.bottomRightFar.x;
  }

  get bottom() {
    return this.bottomRightFar.y;
  }

  get far() {
    return this.bottomRightFar.z;
  }

  collideAxisWith(collisionData, bits) {
    const collisionBits = this.collisions.get(collisionData) ?? 0;
    // tslint:disable-next-line:no-bitwise
    this.collisions.set(collisionData, collisionBits | bits);
  }

  getCollisionBits(collisionData) {
    return this.collisions.get(collisionData);
  }

  clearCollisions() {
    this.collisions.clear();
  }

  applyCollisions(time, fullBits) {
    const collisions = this.collisions;
    for (const secondCollisionData of collisions.keys()) {
      if (collisions.get(secondCollisionData) === fullBits) {
        this.accountForCollisionWith(secondCollisionData, time);
      }
    }
    collisions.clear();
  }

  leaveCollisions(time) {
    const overlapping = this.overlapping;
    for (const overlapperData of overlapping.keys()) {
      if (overlapping.get(overlapperData) !== time) {
        overlapping.delete(overlapperData);
        if (this.callbacks?.onLeave) {
          this.callbacks.onLeave(this.body, overlapperData.body);
        }
      }
    }
  }

  accountForCollisionWith(collisionData, time) {
    const leftPush = this.right - collisionData.left;
    const rightPush = collisionData.right - this.left;
    const xPush = leftPush < rightPush ? -leftPush : rightPush;
    const topPush = this.bottom - collisionData.top;
    const bottomPush = collisionData.bottom - this.top;
    const yPush = topPush < bottomPush ? -topPush : bottomPush;
    const closePush = this.far - collisionData.close;
    const farPush = collisionData.far - this.close;
    const zPush = closePush < farPush ? -closePush : farPush;

    const callbacks = this.callbacks;
    if (callbacks) {
      if (callbacks.onEnter && !this.overlapping.has(collisionData)) {
        callbacks.onEnter(this.body, collisionData.body);
      }
      if (callbacks.onCollide) {
        callbacks.onCollide(this.body, collisionData.body, xPush, yPush, zPush);
      }
    }
    this.overlapping.set(collisionData, time);
  }
}

module.exports = {
  CollisionData,
};
