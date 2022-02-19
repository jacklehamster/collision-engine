(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
class CollisionBoxHolder {
	constructor(calculateCollisionBox) {
		this.collisionBoxes = new Map();
		this.calculateCollisionBox = calculateCollisionBox;
	}

	getCollisionBox(body, time) {
		let collisionBox = this.collisionBoxes.get(body);
		if (!collisionBox) {
			this.collisionBoxes.set(body, collisionBox = {});
		}
		this.calculateCollisionBox(body, collisionBox);
		return collisionBox;
	}

	remove(body) {
		this.collisionBoxes.delete(body);
	}
}

module.exports = {
	CollisionBoxHolder,
};

},{}],2:[function(require,module,exports){
const { Marker } = require("./marker");

class CollisionData {
	constructor(body, {
		onCollide, onLeave, onEnter,
	}) {
		this.body = body;
		this.collisions = new Map();
		this.overlapping = new Map();
		this.topLeftClose = new Marker(this, true);
		this.bottomRightFar = new Marker(this, false);
		this.callbacks = onCollide || onLeave || onEnter ? {
			onCollide,
			onLeave,
			onEnter,
		} : null;
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

},{"./marker":5}],3:[function(require,module,exports){
const { CollisionData } = require("./collision-data");
const { CollisionBoxHolder } = require("./collision-box-holder");
const { Marker } = require("./marker");


const HORIZONTAL = 0, VERTICAL = 1, DEEP = 2;

class CollisionMixer {
	constructor({horizontal, vertical, deep,
			getCollisionBox,
			calculateCollisionBox,
			onCollide,
			onEnter,
			onLeave}) {
		this.H = 1 << HORIZONTAL;
		this.V = 1 << VERTICAL;
		this.D = 1 << DEEP;

		this.BOTH = (horizontal ? this.H : 0) | (vertical ? this.V : 0) | (deep ? this.D : 0);
		this.temp = {
			openColliders: new Set(),
			countedColliders: new Set(),
			markers: [],
		};
		this.sortCallbacks = [
			Marker.compareHorizontal,
			Marker.compareVertical,
			Marker.compareDepth,
		];

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


module.exports = {
	CollisionMixer,
};

globalThis.CollisionMixer = CollisionMixer;

},{"./collision-box-holder":1,"./collision-data":2,"./marker":5}],4:[function(require,module,exports){
const { CollisionMixer } = require("./collision-mixer");

module.exports = {
	CollisionMixer,
};

},{"./collision-mixer":3}],5:[function(require,module,exports){
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

},{}]},{},[4]);
