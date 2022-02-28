const expect = require('chai').expect;

const { CollisionMixer } = require('./index.js');

describe('CollisionMixer', function () {
  it('should detect collisions', async function () {
    const overlaps = new Set();

    const collisionMixer = new CollisionMixer({
      horizontal: true,
      vertical: true,
      getCollisionBox: (box) => box,
      onEnter: (body, other) => overlaps.add(`${body.id}-${other.id}`),
      onLeave: (body, other) => overlaps.delete(`${body.id}-${other.id}`),
    });

    const box1 = { id: 'box1', left: 0, right: 10, top: 0, bottom: 10 };
    const box2 = { id: 'box2', left: 5, right: 15, top: 5, bottom: 15 };
    const box3 = { id: 'box3', left: 20, right: 25, top: 5, bottom: 15 };

    collisionMixer.addCollision(box1);
    collisionMixer.addCollision(box2);
    collisionMixer.addCollision(box3);

    collisionMixer.refresh(1);

    expect(overlaps.has('box1-box2')).to.equal(true);
    expect(overlaps.has('box2-box1')).to.equal(true);
    expect(overlaps.size).to.equal(2);

    box1.left = 22;

    collisionMixer.refresh(2);

    expect(overlaps.has('box1-box3')).to.equal(true);
    expect(overlaps.has('box3-box1')).to.equal(true);
    expect(overlaps.size).to.equal(2);
  });

  it('should detect circular collisions', async function () {
    const overlaps = new Set();

    const collisionMixer = new CollisionMixer({
      horizontal: true,
      vertical: true,
      getCollisionBox: (box) => box,
      onEnter: (body, other) => overlaps.add(`${body.id}-${other.id}`),
      onLeave: (body, other) => overlaps.delete(`${body.id}-${other.id}`),
    });

    const box1 = { id: 'box1', left: 0, right: 20, top: 0, bottom: 20, radius: 5 };
    const box2 = { id: 'box2', left: 10, right: 30, top: 0, bottom: 20, radius: 5 };
    const box3 = { id: 'box3', left: 10, right: 30, top: 10, bottom: 30, radius: 5 };

    collisionMixer.addCollision(box1);
    collisionMixer.addCollision(box2);
    collisionMixer.addCollision(box3);

    collisionMixer.refresh(1);

    expect(overlaps.has('box1-box2')).to.equal(true);
    expect(overlaps.has('box2-box1')).to.equal(true);
    expect(overlaps.has('box2-box3')).to.equal(true);
    expect(overlaps.has('box3-box2')).to.equal(true);
    expect(overlaps.has('box1-box3')).to.equal(false);
    expect(overlaps.has('box3-box1')).to.equal(false);
    expect(overlaps.size).to.equal(4);
  });
});
