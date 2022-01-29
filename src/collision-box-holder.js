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
