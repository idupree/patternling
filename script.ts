(function(){
"use strict";

// https://github.com/basarat/typescript-collections
/// <reference path="collections.ts" />

window.trains = {};

// maths order
enum Dir {E, NE, N, NW, W, SW, S, SE};

interface Offset {
  x: number;
  y: number;
};
interface Location {
  x: number;
  y: number;
};
function offset(x:number, y:number): Offset { return {x: x, y: y}; }
function locatio(x:number, y:number): Location { return {x: x, y: y}; }

var dirOffsets: Dictionary<Dir, Offset> = new collections.Dictionary<Dir, Offset>();
var offsetDirs: Dictionary<Offset, Dir> = new collections.Dictionary<Offset, Dir>();
[
[E, offset(1,0)],
[NE, offset(1,1)],
[N, offset(0,1)],
[NW, offset(-1,1)],
[W, offset(-1,0)],
[SW, offset(-1,-1)],
[S, offset(0,-1)],
[SE, offset(1,-1)]
].forEach(function(d_o) {
  var dir = d_o[0];
  var offset = d_o[1];
  dirOffsets.setValue(dir, offset);
  offsetDirs.setValue(offset, dir);
};

function oppositeOffset(off:Offset):Offset {
  return offset(-off.x, -off.y);
}

function oppositeDir(dir:Dir):Dir {
  return offsetDirs(oppositeOffset(dirOffsets(dir)));
}


interface TrackUnit {
// The two ends of the track.
// Directions specified from the point of view
// of moving from the center of the tile.
// Invariant (sadly not enforced): a != b.
// TODO should it have a canonical form where a<b?
  a: Dir,
  b: Dir
//  loc: Location
}

// Invariant (sadly not enforced): none of the TrackUnits are the same
// nor opposites (a/b swapped).
// If any two track units both have the same Dir, then this location
// is a switch.
type TrackUnits = TrackUnit[];

enum TrainFlexibility { FortyFive, Ninety };

interface TrainCar {
  modelName: string;
  // A well-run transit agency will id all its train cars with unique
  // ids, but maybe this one isn't well-run.
  id?: string;
  // A train car has "a" and "b" ends.
  // The directions refer to the orientation of the wheels on each end
  // of the train car.
  // Most trains can't turn around a sharp corner but some can (TODO?).
  // For the trains that can't, "a" and "b" have to be at least 135 degrees
  // apart from each other (unenforced invariant) (maybe the train is broken/
  // derailed if not).
  trainFlexibility: TrainFlexibility;
  derailed: boolean;
  a: Dir;
  b: Dir;
  // currently: don't link to what I'm coupled to, just imply it with the
  // direction and a boolean and it had better be symmetric??
  aCoupled: boolean;
  bCoupled: boolean;
}

interface Tile {
  tracks: TrackUnits;
  trainCar?: TrainCar;
}

// TODO is there a min/max x or y or anything?
type WorldMap = Dictionary<Location, Tile>;

trains.map = new WorldMap();

// TODO do i want to draw with svg? canvas? dom elements? d3.js?
// svg/dom means I can use css animation.
// d3 looks pretty decent...

function trainToCss(oldLoc:Location, newLoc:Location, trainCar:TrainCar) {
}

//_.each(trains.



}());
