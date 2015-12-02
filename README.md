
TrainWorld II
---

Welcome, dear traveller or meddler!

![trains5](https://cloud.githubusercontent.com/assets/947619/11516833/f933f082-9853-11e5-8b17-a1fd939dfad8.png)

Track generation as of December 1st
===

The code is in `script.ts`. The overview is first I
generate some "track end-points" that consist of a location and an
orientation, and then I connect every pair of end-point sides[1] that meet
certain criteria.

The end-points are little and purple, while the tracks are black.

The connections are cubic Bézier curves whose control points are in
the direction from each endpoint matching that endpoint's
angle, at a distance from the endpoint equal to half the Euclidean
distance between the two endpoints. (Bézier curves are a little weird
but you can look them up. Currently I'm using
http://pomax.github.io/bezierjs/ for most of the computations with them.
Many graphics engines let you draw Bézier curves directly, including
SVG, HTML 2D Canvas, Apple Cocoa, but not OpenGL. Currently I am
creating SVG elements dynamically from Javascript.  (Actually I'm using
TypeScript compiled to Javascript, because having a type system
really helps me figure out what I want.)

The next step is to have any trains for these tracks. Currently
there are no trains.

[1] I call each of the two sides of an end-point
a "switch" because more than one track can be connected to the same
side of an end point.  If there are more than one track on one side
(and at least one track on the other side), then it will function
as a switch once there are any trains.  Otherwise it is a kind
of silly name to call a straight-through track connection (or a
dead-end) a "switch", but it works okay.

FAQ
===

### I need to compile it??

Yeah, you need the TypeScript tools. Run `tsc script.ts`
unless this readme sentence is out of date.

### Is it finished?

No.

### Is there a TrainWorld I?

No.  There are unrelated things called TrainWorld, so the II
is a cheesy way to give this project a more unique name.

### Why do the trains move in a way that doesn't make much sense?

There is no dispatcher, except maybe the viewer.

### Who is paying for this?

In a fantasy world, you can build train tracks and power trains for
free, effortlessly. Right? Right???

## How do I look at the code?

HTML: index.html  
CSS: style.css  
JS: script.ts (typescript that you should compile to javascript)  
Third party libraries:  
 - collections.ts
 - bezier.js (I wrote bezier.d.ts to integrate it better with
     typescript)

