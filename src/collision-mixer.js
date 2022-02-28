const { CollisionData } = require('./collision-data');
const { CollisionBoxHolder } = require('./collision-box-holder');
const { Marker } = require('./marker');
const { Constants } = require("./constants");

/* tslint:disable:no-bitwise */
class CollisionMixer {
  constructor({ horizontal, vertical, deep, getCollisionBox, calculateCollisionBox, onCollide, onEnter, onLeave }) {
    this.BOTH = (horizontal ? Constants.H : 0) | (vertical ? Constants.V : 0) | (deep ? Constants.D : 0);
    this.temp = {
      openColliders: new Set(),
      countedColliders: new Set(),
      markers: [],
    };
    this.sortCallbacks = [Marker.compareHorizontal, Marker.compareVertical, Marker.compareDepth];

    this.collisionDataList = new Map();
    if (getCollisionBox) {
      this.getCollisionBox = getCollisionBox;
    } else if (calculateCollisionBox) {
      this.collisionBoxHolder = new CollisionBoxHolder(calculateCollisionBox);
      this.getCollisionBox = (body, time) => this.collisionBoxHolder.getCollisionBox(body, time);
    } else {
      this.getCollisionBox = (body, time) => body.getCollisionBox(time);
    }
    this.onCollide = onCollide;
    this.onEnter = onEnter;
    this.onLeave = onLeave;
  }

  addCollision(body) {
    if (this.collisionDataList.has(body)) {
      return false;
    }

    const collisionData = new CollisionData(body, {
      onCollide: this.onCollide || body.onCollide,
      onEnter: this.onEnter || body.onEnter,
      onLeave: this.onLeave || body.onLeave,
    });
    this.collisionDataList.set(body, collisionData);
    return true;
  }

  removeCollision(body) {
    const collisionData = this.collisionDataList.get(body);
    if (!collisionData) {
      return false;
    }
    this.collisionDataList.delete(body);
    if (this.collisionBoxHolder) {
      this.collisionBoxHolder.remove(body);
    }
    return true;
  }

  countCollision(collisionData, secondCollisionData, bits, countedColliders) {
    if (!collisionData.shouldCountCollision()) {
      return;
    }
    countedColliders.add(collisionData);
    collisionData.collideAxisWith(secondCollisionData, bits);
  }

  updateMarkers(time, markers) {
    if (markers.length !== this.collisionDataList.size * 2) {
      markers.length = this.collisionDataList.size * 2;
    }

    let index = 0;
    for (const collisionData of this.collisionDataList.values()) {
      const body = collisionData.body;
      const collisionBox = this.getCollisionBox(body, time);
      collisionData.radius = collisionBox.radius ?? 0;

      const topLeftClose = collisionData.topLeftClose;
      topLeftClose.x = collisionBox.left;
      topLeftClose.y = collisionBox.top;
      topLeftClose.z = collisionBox.close;
      markers[index++] = topLeftClose;

      const bottomRightFar = collisionData.bottomRightFar;
      bottomRightFar.x = collisionBox.right;
      bottomRightFar.y = collisionBox.bottom;
      bottomRightFar.z = collisionBox.far;
      markers[index++] = bottomRightFar;
    }
  }

  refresh(time) {
    const { countedColliders, markers } = this.temp;

    this.updateMarkers(time, markers);

    for (let m = 0; m < this.sortCallbacks.length; m++) {
      const bits = 1 << m;
      if (this.BOTH & bits) {
        markers.sort(this.sortCallbacks[m]);
        this.countCollisionFromMarkers(markers, bits, countedColliders);
      }
    }

    this.applyCollisionsOnAll(countedColliders, time);
  }

  countCollisionFromMarkers(markers, bits, countedColliders) {
    const openColliders = this.temp.openColliders;
    for (const marker of markers) {
      if (marker.isTopLeftClose) {
        this.countNewCollisionsWithOpenColliders(marker.collisionData, bits, openColliders, countedColliders);
        openColliders.add(marker.collisionData);
      } else {
        openColliders.delete(marker.collisionData);
      }
    }
  }

  countNewCollisionsWithOpenColliders(collisionData, bits, openColliders, countedColliders) {
    for (const openCollider of openColliders) {
      if (openCollider !== collisionData) {
        this.countCollision(openCollider, collisionData, bits, countedColliders);
      }
    }
    if (collisionData.shouldCountCollision()) {
      for (const openCollider of openColliders) {
        if (openCollider !== collisionData) {
          this.countCollision(collisionData, openCollider, bits, countedColliders);
        }
      }
    }
  }

  applyCollisionsOnAll(countedColliders, time) {
    for (const collisionData of countedColliders) {
      collisionData.applyCollisions(time, this.BOTH);
    }
    for (const collisionData of countedColliders) {
      collisionData.leaveCollisions(time);
    }
    countedColliders.clear();
  }
}
/* tslint:enable:no-bitwise */

module.exports = {
  CollisionMixer,
};

globalThis.CollisionMixer = CollisionMixer;
