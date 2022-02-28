const { Marker } = require('./marker');
const { Constants } = require('./constants');

class CollisionData {
  constructor(body, { onCollide, onLeave, onEnter }) {
    this.body = body;
    this.collisions = new Map();
    this.overlapping = new Map();
    this.topLeftClose = new Marker(this, true);
    this.bottomRightFar = new Marker(this, false);
    this.radius = 0;
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

  get centerX() {
    return (this.left + this.right) / 2;
  }

  get centerY() {
    return (this.top + this.bottom) / 2;
  }

  get centerZ() {
    return (this.close + this.far) / 2;
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
        if (this.radius && secondCollisionData.radius) {
          this.checkRadiusCollisionWith(secondCollisionData, fullBits, time);
        } else {
          this.accountForCollisionWith(secondCollisionData, time);
        }
      }
    }
    collisions.clear();
  }

  checkRadiusCollisionWith(secondCollisionData, fullBits, time) {
    /* tslint:disable:no-bitwise */
    const dx = fullBits & Constants.H ? this.centerX - secondCollisionData.centerX : 0;
    const dy = fullBits & Constants.V ? this.centerY - secondCollisionData.centerY : 0;
    const dz = fullBits & Constants.D ? this.centerZ - secondCollisionData.centerZ : 0;
    /* tslint:enable:no-bitwise */
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const collisionDepth = this.radius + secondCollisionData.radius - distance;
    if (collisionDepth >= 0) {
      this.applyCollisionWithPush(
        secondCollisionData,
        time,
        (collisionDepth * dx) / distance,
        (collisionDepth * dy) / distance,
        (collisionDepth * dz) / distance,
        true,
      );
    }
  }

  leaveCollisions(time) {
    const overlapping = this.overlapping;
    for (const overlapperData of overlapping.keys()) {
      if (overlapping.get(overlapperData) !== time) {
        overlapping.delete(overlapperData);
        if (this.callbacks.onLeave) {
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

    this.applyCollisionWithPush(collisionData, time, xPush, yPush, zPush, false);
  }

  applyCollisionWithPush(collisionData, time, xPush, yPush, zPush, circular) {
    const callbacks = this.callbacks;
    if (callbacks) {
      if (callbacks.onEnter && !this.overlapping.has(collisionData)) {
        callbacks.onEnter(this.body, collisionData.body);
      }
      if (callbacks.onCollide) {
        callbacks.onCollide(this.body, collisionData.body, xPush, yPush, zPush, circular);
      }
    }
    this.overlapping.set(collisionData, time);
  }
}

module.exports = {
  CollisionData,
};
