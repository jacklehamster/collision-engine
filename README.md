# ![https://www.flaticon.com/free-icon/car-crash_91684](icon.png)

# collision-engine
Component for detecting collisions



[![CodeQL](https://github.com/jacklehamster/collision-engine/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/jacklehamster/collision-engine/actions/workflows/codeql-analysis.yml)

[![pages-build-deployment](https://github.com/jacklehamster/collision-engine/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/jacklehamster/collision-engine/actions/workflows/pages/pages-build-deployment)

## Setup

### Directly in web page

Include the scripts in html as follow:
```
<script src="https://unpkg.com/collision-engine/public/collision-engine.js"></script>
```


### Through NPM


Add to `package.json`:
```
  "dependencies": {
  	...
    "collision-engine": "^1.0.0",
    ...
  }
```


Use Browserify to make classes available in browser

In `package.json`:
```
  "scripts": {
  	...
    "browserify": "browserify browserify/main.js -s dok-lib -o public/gen/compact.js",
    ...
  },

```

In `browserify/main.js`:
```
const { CollisionMixer } = require('collision-engine');

module.exports = {
  CollisionMixer,
};
```

## Components

### CollisionMixer

#### Description
Component for detecting collisions.

#### Usage

1. First setup the collision mixer.
```
    const collisionMixer = new CollisionMixer({
      horizontal: true, vertical: true, deep: true,
      getCollisionBox: box => box,
      calculateCollisionBox: (box, collisionBox) => box.processBox(collisionBox),
      onEnter: (body, other) => body.onEnter(other),
      onLeave: (body, other) => body.onLeave(other),
      onCollide: (body, other, xPush, yPush, zPush) => body.onCollide(other),
    });
```
- horizontal[default=false]: if true, we enable collisions on the x-axis.
- vertical[default=false]: if true, we enable collisions on the y-axis.
- deep[default=false]: if true, we enable collisions on the z-axis.
- getCollisionBox[optional]: if set, it's a callback that takes a body should return an object that contains: {left, right, top, bottom, close, far} (depending on the axis enabled).
- calculateCollisionBox[optional]: a callback that takes a body and a collisionBox. Instead of returning the collisionBox, it must set the {left, right, top, bottom, close, far} properties (depending on axis enabled). This is similar to getCollisionBox but it lets you set the box without instantiation, for better performance. Note that if getcollisionBox is passed, this is ignored.
- onEnter: callback triggered when a body enters collision with other.
- onLeave: callback triggered when a body leaves collision (stops overlapping).
- onCollide: callback triggered every frame as long as two bodies overlap. xPush, yPush, zPush determines how deep both objects overlap.

2. Add bodies to check for collision.
```
collisionMixer.add(body);
```

3. Call refresh to check for check for collisions and allow triggering of events.
```
collisionMixer.refresh(time);
```

Note that time is a number change must change every time refresh is called. Typically, the time from requestAnimationFrame parameter is used.

## Notes on performance and algorithm

I tried to make this algorithm perform as fast as I can know how to make it. I'm sure there are even faster algorithms out there, but I think the one I use here is not too bad. (Beats brute force O( $n^2$ ))). I'll just explain it here so you know how it performs:

1. Pick up all box corner coordinates on the x-axis, on the y-axis, and on the z-axis. Each box has two markers on each axis.
2. Sort all axis ( O( $log(n)$ )
3. Iterate through an axis. When we hit a box's marker, put it in a hash. When we hit that box's second marker, remove it from the hash.
4. Each time we add a box into the hash, look through the whole hash. Every elements currently in that hash overlap.
    - This might seem like a costly operation, but in an environment where at most 2-3 elements can overlap, it's just ends up being O(n).
5. Perform callbacks on every box overlapping.

### Demo

[demo](https://jacklehamster.github.io/collision-engine/)
