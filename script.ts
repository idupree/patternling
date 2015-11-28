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
export enum Dir {E, NE, N, NW, W, SW, S, SE};

export interface Offset {
  x: number;
  y: number;
}
export interface NormalizedOffset {
  // x^2+y^2 approximately = 1
  x: number;
  y: number;
}
export interface Location {
  x: number;
  y: number;
}
//toString?
/*function xyToString(xy: Offset): string {
  return 
}*/
export function offset(x:number, y:number): Offset { return {x: x, y: y}; }
export function locatio(x:number, y:number): Location { return {x: x, y: y}; }

export var dirOffsets: collections.Dictionary<Dir, Offset> = new collections.Dictionary<Dir, Offset>();
export var offsetDirs: collections.Dictionary<Offset, Dir> = new collections.Dictionary<Offset, Dir>();
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
export type CardinalDir = Dir;

export function oppositeOffset(off:Offset):Offset {
  return offset(-off.x, -off.y);
}

export function oppositeDir(dir:Dir):Dir {
  return offsetDirs.getValue(oppositeOffset(dirOffsets.getValue(dir)));
}

export enum Parity { A = 0, B = 1 };

export type ID = number; // could be uuid?
export interface TrackEnd {
  id: ID;
  // this loc/dir could be 3D
  location: Location;
  // direction of end A
  direction: NormalizedOffset;
  ends: [Switch, Switch];
//  a: Switch;
//  b: Switch;
}
// create the bezier based on assumietAttribute("d",g the curve is <180deg, i guess, to choose ends
export interface Track {
  id: ID;
  ends: [Switch, Switch];
//  a: Switch;
//  b: Switch;
}
export interface Switch {
  id: ID;
  trackEnd: TrackEnd;
  //whichSideOfTrackEnd: Parity;
  // ^ that can be checked by identity based equality comparison
  tracks: {[id: number]: Track};
  switchPosition: ID; // track id
//  tracks: Track[];
//  switchPosition: number; // index into tracks array. can it be null if in a bad position?
}
// ugh i wish i had an in-memory relational database instead of keeping
// track of all this by hand:
export interface TrackWorld {
  autoIncrement: number;
  trackEnds: {[id: number]: TrackEnd};
  tracks: {[id: number]: Track};
  switches: {[id: number]: Switch};
}
//var trackWorld = new TrackWorld();
export var trackWorld: TrackWorld = {
  autoIncrement: 0,
  trackEnds: {},
  tracks: {},
  switches: {}
};
// TODO look up whether one already exists and reuse that??
export function createTrackEnd(l: Location, d: NormalizedOffset): TrackEnd {
  var trackEnd = {
    id: trackWorld.autoIncrement++,
    location: l,
    direction: d,
    ends: null
  };
  trackEnd.ends = [
    { id: trackWorld.autoIncrement++, trackEnd: trackEnd, tracks: [], switchPosition: null },
    { id: trackWorld.autoIncrement++, trackEnd: trackEnd, tracks: [], switchPosition: null },
  ];
  trackWorld.trackEnds[trackEnd.id] = trackEnd;
  trackWorld.switches[trackEnd.ends[Parity.A].id] = trackEnd.ends[Parity.A];
  trackWorld.switches[trackEnd.ends[Parity.B].id] = trackEnd.ends[Parity.B];
  return trackEnd;
}
export function createTrack(ends: [Switch, Switch]) {
  var track = {
    id: trackWorld.autoIncrement++,
    ends: ends
  };
  trackWorld.tracks[track.id] = track;
  return track;
}
export function trackEndIsUnused(trackEnd: TrackEnd): boolean {
  return (
    Object.keys(trackEnd.ends[Parity.A].tracks).length === 0 &&
    Object.keys(trackEnd.ends[Parity.B].tracks).length === 0);
}
export function deleteTrackEnd(trackEnd: TrackEnd) {
  console.assert(trackEndIsUnused(trackEnd));
  delete trackWorld.switches[trackEnd.ends[Parity.A].id];
  delete trackWorld.switches[trackEnd.ends[Parity.B].id];
  delete trackWorld.trackEnds[trackEnd.id];
}
export function deleteTrack(t: Track, deleteUnusedTrackEnds = true) {
  for(var s of t.ends) {
    delete s.tracks[t.id];
    if(s.switchPosition === t.id) {
      // TODO is this my fav algorithm?
      // Is it even "safe" to automatically connect to a new route?
      // (In terms of trains now crashing into each other. Although
      // there's also no protection against deleting a track a train
      // is on, also TODO.)
      // Should it behave differently depending whether there's only one
      // alt left?
      var alts = Object.keys(s.tracks);
      if(alts.length === 0) {
        s.switchPosition = null;
      } else {
        s.switchPosition = +alts[0];
      }
    }
    if(trackEndIsUnused(s.trackEnd)) {
      deleteTrackEnd(s.trackEnd);
    }
  }
  delete trackWorld.tracks[t.id];
}

// returns cardinaldir?. undefined and null apparently go in any type.
export function cardinalDirOfTrackEnd(end: TrackEnd): CardinalDir {
  return offsetDirs.getValue(end.direction);
}
export function cardinalDirsOfTrack(t: Track): [CardinalDir, CardinalDir] {
  // TODO normalize to the correct opposite for this track
  return [
    cardinalDirOfTrackEnd(t.ends[Parity.A].trackEnd),
    cardinalDirOfTrackEnd(t.ends[Parity.B].trackEnd)];
}
export function switchIsJustOneTrack(s:Switch):boolean {
  return Object.keys(s.tracks).length === 1;
}
export function switchTrack(s:Switch):Track {
  return s.tracks[s.switchPosition];
}
export function implicitOtherTracksOverlappingThisOneWithFrogs(t:Track): Track[] {
  // TODO implement if needed
  return [];
}
export function switchDirection(s:Switch): NormalizedOffset {
  if(s.trackEnd.ends[Parity.A] === s) {
    return s.trackEnd.direction;
  } else {
    return oppositeOffset(s.trackEnd.direction);
  }
}

export function svgXYdString(xy:Offset): string {
  return `${xy.x} ${xy.y}`;
}
// TODO make it not be a monorail
// two curves
// ties
export function trackToSvg(t:Track): Element {
  //var offsets:[Offset, Offset] = _.map(t.ends, switchDirection);
//  var aoff = t.a.direction
// can return a group <g>
  var d = `
M ${svgXYdString(t.ends[Parity.A].trackEnd.location)} C
${svgXYdString(switchDirection(t.ends[Parity.A]))}
${svgXYdString(switchDirection(t.ends[Parity.B]))}
${svgXYdString(t.ends[Parity.B].trackEnd.location)}
`;
  var path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
  path.setAttribute("d", d);
  return path;
}

// No frogs yet, besides cheaty crossing
//interface Frog {
//  CrossedTracks:
//}

// no traincars yet


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
