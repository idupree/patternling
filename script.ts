//(function(){
//"use strict";

// My vim doesn't know about typescript:
// vim: filetype=javascript

// https://github.com/basarat/typescript-collections
/// <reference path="collections.ts" />

module TrainWorldII {

//type Dict = collections.Dictionary;

//window.trains = {};
//export var trains = {};

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

var dirOffsets: collections.Dictionary<Dir, Offset> = new collections.Dictionary<Dir, Offset>();
var offsetDirs: collections.Dictionary<Offset, Dir> = new collections.Dictionary<Offset, Dir>();
[
{dir: Dir.E, offset: offset(1,0)},
{dir: Dir.NE, offset: offset(1,1)},
{dir: Dir.N, offset: offset(0,1)},
{dir: Dir.NW, offset: offset(-1,1)},
{dir: Dir.W, offset: offset(-1,0)},
{dir: Dir.SW, offset: offset(-1,-1)},
{dir: Dir.S, offset: offset(0,-1)},
{dir: Dir.SE, offset: offset(1,-1)},
].forEach(function(v) {
  dirOffsets.setValue(v.dir, v.offset);
  offsetDirs.setValue(v.offset, v.dir);
});

function oppositeOffset(off:Offset):Offset {
  return offset(-off.x, -off.y);
}

function oppositeDir(dir:Dir):Dir {
  return offsetDirs.getValue(oppositeOffset(dirOffsets.getValue(dir)));
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
type WorldMap = collections.Dictionary<Location, Tile>;

//trains.map = new WorldMap();
var trains_map:WorldMap = new collections.Dictionary<Location, Tile>();

// TODO do i want to draw with svg? canvas? dom elements? d3.js?
// svg/dom means I can use css animation.
// d3 looks pretty decent...

function trainToCss(oldLoc:Location, newLoc:Location, trainCar:TrainCar) {
}

//_.each(trains.


// TODO what about different train speeds?? That kind of interferes
// with train cars having a single location. Really they need a location
// between tiles. Like base time and velocity from srctile to dsttile
// and update when it gets to a new tile because we need to anyway
// And acceleration, I guess, why not.
//

// How does braking work
// What about the safety systems
// (Jackie will be able to tell me how they work)
// (And: a 3D view will be quite feasible probably.
//  At least an awful one with css 3d transforms,
//   maybe something better with webgl or three.js)
// (What about elevation?)



}

//}());
