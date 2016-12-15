
// My vim doesn't know about typescript:
// vim: filetype=javascript

// https://github.com/basarat/typescript-collections
/// <reference path="collections.ts" />

/// <reference path="bezier.d.ts" />


// These import statements were tried:
//   import jsdom from "./node_modules/jsdom/lib/jsdom";
//   import { Bezier } from "./bezier";

// Make using 'require' compile in multiple TypeScript versions (1.8 and 2.0)
//declare var require: NodeRequire;
//declare var require: any;
//declare var require: {
//    <T>(path: string): T;
//    (paths: string[], callback: (...modules: any[]) => void): void;
//    ensure: (paths: string[], callback: (require: <T>(path: string) => T) => void) => void;
//};
declare var require: {
  (id: string): any;
  resolve(id:string): string;
  cache: any;
  extensions: any;
  main: any;
};

var is_nodejs = (typeof document === 'undefined' && typeof require !== 'undefined');
if(is_nodejs) {
  var jsdom = require("jsdom");
  var document: Document = jsdom.jsdom("<html><body></body></html>", {});
  var fs = require('fs');
  eval(fs.readFileSync('./bezier.js', 'utf8'));
  eval(fs.readFileSync('./collections.js', 'utf8') + '\nglobal.collections = collections;\n');
}
// equivalent of Object.values
// num/str versions since Typescript won't be polymorphic in key type
function objectnum_values<V>(obj: {[id: number]: V}): V[] {
  return Object.keys(obj).map(function(k) { return obj[k]; });
}
function objectstr_values<V>(obj: {[id: string]: V}): V[] {
  return Object.keys(obj).map(function(k) { return obj[k]; });
}

namespace TrainWorldII {
// This module currently can represent a network
// of train tracks represented as connected bezier
// curves.  In the future, it will also be able to
// represent trains on these tracks.

// # Data types

// ## 2D locations/directions

// maths order (counterclockwise from +x)
export enum Dir {E, NE, N, NW, W, SW, S, SE};

export interface Offset {
  x: number;
  y: number;
}
export interface NormalizedOffset {
  // normalized such that: x^2+y^2 approximately = 1
  x: number;
  y: number;
}
export interface Location {
  x: number;
  y: number;
}
export function offset(x:number, y:number): Offset { return {x: x, y: y}; }
// 'locatio' instead of 'location' so as not to overlap with window.location
export function locatio(x:number, y:number): Location { return {x: x, y: y}; }

// Dictionaries to look up the correspondence between the eight
// directions and their (manhattan-movement-esque) offsets.
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
// N/S/E/W only
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

// ## Track organization.
//
// Tracks are composed of segments (type Track) that are bezier-curve-shaped.
// They are connected in a slightly convoluted way in order to allow
// tracks splitting (a.k.a. switches) including double slip switches.
//
// Two track segments are joined with a connection like this:
// Track -- Switch -- TrackEnd -- Switch -- Track
//
// The TrackEnd stores the location and orientation of the track connection.
// The TrackEnd has A and B sides, each of which has one Switch. Each
// Switch has many Tracks. The Switch records which its Tracks it's
// currently switched to (trains can arrive and depart there).
// For track connections with no options, this is a very dull record.
//
// Tracks also have A and B ends; no consistent relation to the A and B
// in a TrackEnd.  These are arbitrary orderings to make it possible for
// code to discuss which end it's talking about.

export enum Parity { A = 0, B = 1 };

export type ID = number; // could be uuid?
export interface TrackEnd {
  id: ID;
  // Brainstorm: perhaps this loc/dir could be changed to be 3D
  // if I want hills:
  location: Location;
  // direction of end A:
  direction: NormalizedOffset;
  ends: [Switch, Switch];
  // For decorations diffusion stuff:
  zappiness: number;
  snowiness: number;
}
export interface Track {
  id: ID;
  ends: [Switch, Switch];
}
export interface Switch {
  id: ID;
  trackEnd: TrackEnd;
  tracks: {[id: number]: Track};
  switchPosition: ID; // track id
}
// TrackWorld is a little like a relational database.
// All world-objects are here, indexed by IDs.
//
// I wish I had an in-memory relational database instead of keeping
// track of all this by hand. Is IndexedDB portably stable enough and also
// does it have a good serialization format that I can manipulate in other
// languages?
export interface TrackWorld {
  autoIncrement: number;
  trackEnds: {[id: number]: TrackEnd};
  tracks: {[id: number]: Track};
  switches: {[id: number]: Switch};
}
export var trackWorld: TrackWorld = {
  autoIncrement: 0,
  trackEnds: {},
  tracks: {},
  switches: {}
};
// Possible TODO in createTrackEnd: look up whether a TrackEnd already exists
// at this location+direction and reuse that?
export function createTrackEnd(l: Location, d: NormalizedOffset): TrackEnd {
  var trackEnd = {
    id: trackWorld.autoIncrement++,
    location: l,
    direction: d,
    ends: null,
    zappiness: 0,
    snowiness: 0
  };
  trackEnd.ends = [
    { id: trackWorld.autoIncrement++, trackEnd: trackEnd, tracks: {}, switchPosition: null },
    { id: trackWorld.autoIncrement++, trackEnd: trackEnd, tracks: {}, switchPosition: null },
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
  ends.forEach(function(end) {
    end.tracks[track.id] = track;
    if(end.switchPosition == null) {
      end.switchPosition = track.id;
    }
  });
  return track;
}
export function trackEndIsUnused(trackEnd: TrackEnd): boolean {
  return (
    Object.keys(trackEnd.ends[Parity.A].tracks).length === 0 &&
    Object.keys(trackEnd.ends[Parity.B].tracks).length === 0);
}
// half-unused
export function trackEndIsTerminus(trackEnd: TrackEnd): boolean {
  return (
    (Object.keys(trackEnd.ends[Parity.A].tracks).length === 0) !==
    (Object.keys(trackEnd.ends[Parity.B].tracks).length === 0));
}
export function connectedTrackEnds(trackEnd: TrackEnd): TrackEnd[] {
  return (
    objectnum_values(trackEnd.ends[Parity.A].tracks).concat(
    objectnum_values(trackEnd.ends[Parity.B].tracks))
  .map(function(track){
    return track.ends[
      (track.ends[Parity.A].trackEnd.id === trackEnd.id) ? Parity.B : Parity.A
      ].trackEnd;
    }));
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
      // A switch cannot point to a no-longer-existent track.
      // So we need to point it at something else that still exists.
      // (There's currently an invariant that it's pointing at *something*
      // unless there are no tracks connected on this side at all.)
      //
      // TODO is this my favorite fallback-switch-position choice?
      // Is it even "safe" to automatically connect to a new route?
      // (In terms of trains now crashing into each other. Although
      // there's also no protection against deleting a track a train
      // is on, also TODO.)
      //
      // Should it behave differently depending whether there is more
      // than one alternative left? (In which the choice between
      // the remaining ones is kind of arbitrary.)
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

// If the track-end is pointing exactly N/S/E/W, returns that;
// otherwise returns undefined.
export function cardinalDirOfTrackEnd(end: TrackEnd): CardinalDir {
  return offsetDirs.getValue(end.direction);
}
export function cardinalDirsOfTrack(t: Track): [CardinalDir, CardinalDir] {
  // TODO: this does not check the A/B parity of the TrackEnds.
  // So it might (for example) return N when it would be less confusing to
  // return S, from the point of view of the Track.
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
// "frogs" are where two tracks overlap at an angle without
// trains being able to switch which track they're on.
// They can arise in this sim just by tracks overlapping.
// This function (once implemented) will find out which tracks
// are overlapping a given track.
export function implicitOtherTracksOverlappingThisOneWithFrogs(t:Track): Track[] {
  // TODO implement if needed
  return [];
}
// Returns the direction that the tracks connected to this
// Switch are pointed at this end.
export function switchDirection(s:Switch): NormalizedOffset {
  if(s.trackEnd.ends[Parity.A] === s) {
    return s.trackEnd.direction;
  } else {
    return oppositeOffset(s.trackEnd.direction);
  }
}
// Returns the bezier curve of an imaginary Track connecting
// these two Switches, regardless of whether this Track exists.
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



// # code to display track-world as SVG

export function svgXYdString(xy:Offset): string {
  return `${xy.x} ${xy.y}`;
}
export function createSVGElement(name:string): SVGElement {
  return document.createElementNS("http://www.w3.org/2000/svg", name) as SVGElement;
}
export function createSVGLine(): SVGLineElement {
  return createSVGElement('line') as SVGLineElement;
}
// rgb 0..1
export function clamp(n: number, min: number, max: number): number {
  return (n < min) ? min : ((n >= max) ? max : n);
}

export function svgrgb(r: number, g: number, b: number): string {
  return 'rgb(' +
    clamp(Math.floor(256 * r), 0, 255) + ',' +
    clamp(Math.floor(256 * g), 0, 255) + ',' +
    clamp(Math.floor(256 * b), 0, 255) + ')';
}
// TODO make it not look like a monorail:
// - two curves
// - ties
export function trackToSvg(t:Track): Element {
  // can return a group <g> if that becomes desired
  var aLoc = t.ends[Parity.A].trackEnd.location;
  var bLoc = t.ends[Parity.B].trackEnd.location;
  var dist = offsetEuclideanDistance(subOffset(bLoc, aLoc));
  // SVG syntax for bezier curves:
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
  //path.setAttribute("stroke", svgrgb(0.1, 0.7, 0.4));
  var zappiness = (t.ends[Parity.A].trackEnd.zappiness + t.ends[Parity.B].trackEnd.zappiness)/2;
  path.setAttribute("stroke", svgrgb(0.1, zappiness, 0.4));
  path.setAttribute("stroke-width", "5");
  path.setAttribute("fill-opacity", "0.0");
  return path;
}
export function trackEndToSvg(te: TrackEnd): Element {
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
  if(trackEndIsUnused(te) /*|| trackEndIsTerminus(te)*/) {
    line.setAttribute("stroke", "#040");
    line.setAttribute("stroke-width", "5");
    line.setAttribute("stroke-opacity", "0.0");
  } else {
    line.setAttribute("stroke", svgrgb(te.zappiness*3, 0, te.zappiness));
    line.setAttribute("stroke-width", "2");
  }
  return line;
}
export function drawWorldOnPage() {
  drawWorldIn(document.getElementById('world'));
}
export function drawWorldSVG(): SVGSVGElement {
  var svgElem = createSVGElement('svg') as SVGSVGElement;
  drawWorldIn(svgElem);
  return svgElem;
}
export function drawWorldSVGText(): string {
  var svgElem = drawWorldSVG();
  // outerHTML does not by itself set xmlns= to make
  // the serialization be correct SVG XML, so set it
  // here.
  svgElem.setAttribute('xmlns', "http://www.w3.org/2000/svg");
  svgElem.setAttribute('version', "1.1");
  var div = document.createElement('div');
  div.appendChild(svgElem);
  return div.innerHTML;
}
export function drawWorldIn(svgElem) {
  if(!svgElem) {
    return;
  }
  var minX = 1/0, minY = 1/0, maxX = -1/0, maxY = -1/0;
  // I think this is where d3 might come in handy?
  // TODO remove any old content from the #world element
  // before adding more.
  for(var tID of Object.keys(trackWorld.tracks)) {
    var t = trackWorld.tracks[+tID];
    svgElem.appendChild(trackToSvg(t));
  }
  for(var teID of Object.keys(trackWorld.trackEnds)) {
    var trackEnd = trackWorld.trackEnds[+teID];
    svgElem.appendChild(trackEndToSvg(trackEnd));
    if(minX > trackEnd.location.x) { minX = trackEnd.location.x; }
    if(minY > trackEnd.location.y) { minY = trackEnd.location.y; }
    if(maxX < trackEnd.location.x) { maxX = trackEnd.location.x; }
    if(maxY < trackEnd.location.y) { maxY = trackEnd.location.y; }
  }
  minX -= 5;
  minY -= 5;
  maxX += 5;
  maxY += 5;
  var width = maxX - minX, height = maxY - minY;
  svgElem.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
}


// # Pretty random world generation

// This rand function is terrible; TODO switch to underscore or other.
function randint(n:number):number {
  return Math.floor(Math.random()*n);
}
var arenaWidth = 500;
var arenaHeight = 500;
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
export function absFirstLastAngleDelta(bezier: Bezier): number {
  var firstTangent = bezier.derivative(0);
  var firstAngle = Math.atan2(firstTangent.y, firstTangent.x);
  var lastTangent = bezier.derivative(1);
  var lastAngle = Math.atan2(lastTangent.y, lastTangent.x);
  return absAngleDelta(firstAngle, lastAngle);
}
export function approximateMaxCurveTightness(bezier: Bezier): number {
  // maybe TODO use the bezier library's 'arcs' code?
  var maxCurveTightness = 0; // measured in radians per pixel
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
    if(maxCurveTightness < curveTightness) {
      maxCurveTightness = curveTightness;
    }
    //console.log(curveTightness);
  }
  return maxCurveTightness;
}
// (excludes a track-end connecting to itself on either
// the same or opposite side)
// Track-end-side = Switch
export function forEachNearbyTrackEndSidePair(trackEnds, maxDist, callback: (s1: Switch, s2: Switch, bezier: Bezier)=>void) {
  for(var j = 0; j !== trackEnds.length; ++j) {
  for(var k = j+1; k !== trackEnds.length; ++k) {
    var trackEnd1 = trackEnds[j];
    var trackEnd2 = trackEnds[k];
    var euclideanDist = offsetEuclideanDistance(subOffset(
                          trackEnd1.location, trackEnd2.location));
    if(euclideanDist <= maxDist) {
      for(var parity1 = 0; parity1 !== 2; parity1++) {
        for(var parity2 = 0; parity2 !== 2; parity2++) {
          var s1 = trackEnd1.ends[parity1];
          var s2 = trackEnd2.ends[parity2];
          var bezier = bezierFromPossibleTrack(s1, s2);
          if(bezier.length() > maxDist) {
            //console.log("long", trackEnd1.location, trackEnd2.location, bezier.length(), firstAngle, lastAngle, firstLastAngleDelta);
            continue;
          }
          callback(s1, s2, bezier);
        }
      }
    }
  }
  }
}

// # Actually generate the world

export function demoInit() {
  var trackEnds = [];
  var patternbase = Math.random();
  var basedist = 30+randint(60);
  if(patternbase < 0.1) {
    createRandomTrackEnds(50 + randint(200), trackEnds);
  } else if(patternbase < 0.2) {
    createSquareGridTrackEnds(20, 20, arenaWidth, arenaHeight, basedist, trackEnds);
  } else {
    createHexGridTrackEnds(20, 20, arenaWidth, arenaHeight, basedist, trackEnds);
  }
  var densitytype = Math.random();
  forEachNearbyTrackEndSidePair(trackEnds, basedist*2.125, function(s1, s2, bezier) {
    var firstLastAngleDelta = absFirstLastAngleDelta(bezier);
    // these checks could ignore z dimension if i want to add z, probably..
    if(firstLastAngleDelta > 3/4*Math.PI) {
      // snobby against U-turns
      return;
    }
    // radians per pixel
    var maxCurveTightness = approximateMaxCurveTightness(bezier);
    // These commented lines contain various options for making different pretty designs.
    if(
      densitytype < 0.05 ? (true) : (
      densitytype < 0.1 ? (maxCurveTightness < Math.PI / 64) : (
      densitytype < 0.5 ? (maxCurveTightness < Math.PI / 64 && Math.random() > 0.5) : (
      true              ? (maxCurveTightness < Math.PI / 64 &&
                            (maxCurveTightness < Math.PI / 128 || Math.random() > 0.5)) : (
      (true)))))
      ) {
      //console.log("success!", trackEnd1.location, trackEnd2.location, bezier.length(), firstAngle, lastAngle, firstLastAngleDelta);
      createTrack([s1, s2]);
    }
  });
  //hmmmmmmmm.... directional zappiness?
  //
  trackEnds.forEach(function(end) {
    if(Math.random() < 0.03) {
      end.zappiness += 1;
    }
    if(Math.random() < 0.06) {
      end.snowiness += 1;
    }
  });
  for(var i = 0; i < 30; i++) {
    trackEnds.forEach(function(end) {
      end.zappiness = Math.max.apply(null, [end.zappiness].concat(
        connectedTrackEnds(end).map((te)=>te.zappiness*0.7)));
    });
  }
}

(function(){
  //console.log("hi1");
  demoInit();
  if(is_nodejs) {
    console.log(drawWorldSVGText());
  } else {
    drawWorldOnPage();
  }
  //console.log("hi2");
}());


// # unfinished commented-out code

// No frogs yet, besides cheaty crossing
//interface Frog {
//  CrossedTracks:
//}


/*
// no traincars yet;
// this code is an unused relic that will be deleted
// when its working version is ready.


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

*/

}

