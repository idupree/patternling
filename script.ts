//(function(){
//"use strict";

// My vim doesn't know about typescript:
// vim: filetype=javascript

// https://github.com/basarat/typescript-collections
/// <reference path="collections.ts" />

/// <reference path="bezier.d.ts" />

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
export function addOffset(loc:Offset, off:Offset):Offset {
  return offset(loc.x + off.x, loc.y + off.y);
}
export function subOffset(loc:Offset, off:Offset):Offset {
  return offset(loc.x - off.x, loc.y - off.y);
}
export function mulOffset(off:Offset, mul:number):Offset {
  return offset(off.x * mul, off.y * mul);
}
export function offsetEuclideanDistance(off:Offset):number {
  return Math.sqrt(off.x * off.x + off.y * off.y);
}
export function normalizeOffset(off:Offset):NormalizedOffset {
  var dist = offsetEuclideanDistance(off);
  return offset(off.x / dist, off.y / dist);
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
export function createSVGElement(name:string): SVGElement {
  return document.createElementNS("http://www.w3.org/2000/svg", name) as SVGElement;
}
export function createSVGLine(): SVGLineElement {
  return createSVGElement('line') as SVGLineElement;
}
// TODO make it not be a monorail
// two curves
// ties
export function trackToSvg(t:Track): Element {
  //var offsets:[Offset, Offset] = _.map(t.ends, switchDirection);
//  var aoff = t.a.direction
// can return a group <g>
  var aLoc = t.ends[Parity.A].trackEnd.location;
  var bLoc = t.ends[Parity.B].trackEnd.location;
  var dist = offsetEuclideanDistance(subOffset(bLoc, aLoc));
  //console.log(aLoc,addOffset(aLoc, switchDirection(t.ends[Parity.A])));
  var d = `
M ${svgXYdString(aLoc)} C
${svgXYdString(addOffset(aLoc,
  mulOffset(switchDirection(t.ends[Parity.A]), dist/2)))}
${svgXYdString(addOffset(bLoc,
  mulOffset(switchDirection(t.ends[Parity.B]), dist/2)))}
${svgXYdString(bLoc)}
`;
  var path = createSVGElement('path');
  path.setAttribute("d", d);
  return path;
}
export function trackEndToSvg(te: TrackEnd): Element {
//  var line = createSVGElement('line');
//  var line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
  var line = createSVGLine();
  var loc = te.location;
  var loc1 = addOffset(te.location, mulOffset(te.direction, 3));
  var loc2 = subOffset(te.location, mulOffset(te.direction, 3));
  // error TS2322: Type 'number' is not assignable to type 'SVGAnimatedLength'.
  // Property 'animVal' is missing in type 'Number'.
  // So I guess TypeScript doesn't understand SVG well enough (or I don't)
  // line.x1 = loc1.x;
  line.setAttribute("x1", loc1.x.toString());
  line.setAttribute("y1", loc1.y.toString());
  line.setAttribute("x2", loc2.x.toString());
  line.setAttribute("y2", loc2.y.toString());
  return line;
}
export function drawWorld() {
  // i think this is where d3 might come in handy?
  var svg = document.getElementById('world');
  //console.log(svg);
  // TODO clear it
  for(var tID of Object.keys(trackWorld.tracks)) {
    var t = trackWorld.tracks[+tID];
    svg.appendChild(trackToSvg(t));
  }
  for(var teID of Object.keys(trackWorld.trackEnds)) {
    var trackEnd = trackWorld.trackEnds[+teID];
    svg.appendChild(trackEndToSvg(trackEnd));
  }
}
export function bezierFromPossibleTrack(s1: Switch, s2: Switch):Bezier {
  var aLoc = s1.trackEnd.location;
  var bLoc = s2.trackEnd.location;
  var dist = offsetEuclideanDistance(subOffset(bLoc, aLoc));
  return new Bezier([
    aLoc,
    addOffset(aLoc, mulOffset(switchDirection(s1), dist/2)),
    addOffset(bLoc, mulOffset(switchDirection(s2), dist/2)),
    bLoc
  ]);
}
//this is terrible, TODO switch to underscore or other
function randint(n:number):number {
  return Math.floor(Math.random()*n);
}
var arenaWidth = 500;
var arenaHeight = 500;
//var tileRadius = 60;
export function createRandomTrackEnd(): TrackEnd {
  var x = randint(arenaWidth);
  var y = randint(arenaHeight);
  var theta = Math.random()*(2*Math.PI);
  return createTrackEnd(
    {x: x, y: y},
    {x:Math.cos(theta), y:Math.sin(theta)});
}
export function createRandomTrackEnds(n, trackEnds) {
  for(var i = 0; i < n; ++i) {
    trackEnds.push(createRandomTrackEnd());
  }
}
export function createSquareGridTrackEnds(xFrom, yFrom, xTo, yTo, tileRadius, trackEnds) {
  for(var x = xFrom; x < xTo; x += tileRadius*2) {
    for(var y = yFrom; y < yTo; y += tileRadius*2) {
      trackEnds.push(createTrackEnd(
        {x: x, y: y},
        {x: 0, y: 1}));
      trackEnds.push(createTrackEnd(
        {x: x+tileRadius, y: y+tileRadius},
        {x: 1, y: 0}));
    }
  }
}
export function createHexGridTrackEnds(xFrom, yFrom, xTo, yTo, tileRadius, trackEnds) {
  var sqrt3over2 = Math.sqrt(3) / 2;
  var parity = tileRadius;
    for(var y = yFrom; y < yTo; y += tileRadius*sqrt3over2*2) {
    parity = parity ? 0 : tileRadius;
  for(var x = xFrom + parity; x < xTo; x += tileRadius*2) {
      trackEnds.push(createTrackEnd(
        {x: x+tileRadius, y: y},
        {x: 1, y: 0}));
        //{x: 0, y: 1}));
      trackEnds.push(createTrackEnd(
        {x: x+tileRadius/2, y: y+tileRadius*sqrt3over2},
        {x: 1/2, y: sqrt3over2}));
      trackEnds.push(createTrackEnd(
        {x: x-tileRadius/2, y: y+tileRadius*sqrt3over2},
        {x: -1/2, y: sqrt3over2}));
    }
  }
}
// result is [0, pi]
export function absAngleDelta(angle1: number, angle2: number): number {
  return Math.abs((Math.abs(angle2 - angle1) + Math.PI) % (2*Math.PI) - Math.PI);
}
(function(){
var trackEnds = [];
//createRandomTrackEnds(100, trackEnds);
//createSquareGridTrackEnds(20, 20, arenaWidth, arenaHeight, 60, trackEnds);
createHexGridTrackEnds(20, 20, arenaWidth, arenaHeight, 60, trackEnds);
for(var j = 0; j !== trackEnds.length; ++j) {
  for(var k = j+1; k !== trackEnds.length; ++k) {
    var trackEnd1 = trackEnds[j];
    var trackEnd2 = trackEnds[k];
    var euclideanDist = offsetEuclideanDistance(subOffset(
                          trackEnd1.location, trackEnd2.location);
    if(euclideanDist < 128) {
      for(var parity1 = 0; parity1 !== 2; parity1++) {
        for(var parity2 = 0; parity2 !== 2; parity2++) {
          var s1 = trackEnd1.ends[parity1];
          var s2 = trackEnd2.ends[parity2];
          var bezier = bezierFromPossibleTrack(s1, s2);
          var firstTangent = bezier.derivative(0);
          var firstAngle = Math.atan2(firstTangent.y, firstTangent.x);
          var lastTangent = bezier.derivative(1);
          var lastAngle = Math.atan2(lastTangent.y, lastTangent.x);
          var firstLastAngleDelta = absAngleDelta(firstAngle, lastAngle);
          if(bezier.length() > 128) {
            //console.log("long", trackEnd1.location, trackEnd2.location, bezier.length(), firstAngle, lastAngle, firstLastAngleDelta);
            continue;
          }
          // these checks could ignore z dimension if i want to add z, probably..
          var tooTightOfATurn = false;
          if(firstLastAngleDelta > 3/4*Math.PI) {
            // snobby against U-turns
            //console.log("too u-turny", euclideanDist, bezier.length(), firstAngle, lastAngle, firstLastAngleDelta);
            continue;
          }
          for(var l = 0; l < 128; ++l) {
            var t1 = l/128;
            var t2 = (l+1)/128;
            var p1 = bezier.get(t1);
            var p2 = bezier.get(t2);
            var dist = offsetEuclideanDistance(subOffset(p1, p2));
            var tangent1 = bezier.derivative(t1);
            var tangent2 = bezier.derivative(t2);
            var angle1 = Math.atan2(tangent1.y, tangent1.x);
            var angle2 = Math.atan2(tangent2.y, tangent2.x);
            var angleDelta = absAngleDelta(angle1, angle2);
            var curveTightness = angleDelta / dist; // radians per pixel
            //console.log(curveTightness);
            if(curveTightness > Math.PI / 64) {
              tooTightOfATurn = true;
              break;
            }
          }
          if(!tooTightOfATurn) {
            //console.log("success!", trackEnd1.location, trackEnd2.location, bezier.length(), firstAngle, lastAngle, firstLastAngleDelta);
            createTrack([s1, s2]);
          }
        }
      }
    }
  }
}

/*
for(var j = 0; j !== 500; ++j) {
  var end1 = randint(trackEnds.length - 1);
  var end2 = end1 + 1 + randint(trackEnds.length - end1 - 1)
  if(offsetEuclideanDistance(subOffset(
        trackEnds[end1].location, trackEnds[end2].location))
      < 100) {
    createTrack([
      trackEnds[end1].ends[randint(2)],
      trackEnds[end2].ends[randint(2)],
    ]);
  }
}
*/

//var m = createTrackEnd({x: 70, y: 200}, {x:1, y:0});
//var n = createTrackEnd({x: 250, y: 300}, {x:1, y:0});
//var o = createTrack([m.ends[Parity.A], n.ends[Parity.B]]);
drawWorld();
}());

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
