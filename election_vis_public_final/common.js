// common.js: shared visualization settings and state
'use strict';

/* import and then export d3. This does depend on having a network connection.  If that is
  inconvenient to you, please post something on EdStem saying so and GLK will try to fix this for
  future assignments. */
import * as d3 from 'https://cdn.skypack.dev/d3@7';
export { d3 };

// parameters that control geometry and appearance
export const parm = {
  transDur: 300, // duration of all transition()s
  circRad: 6, // size of circle marks in scatterplot
  scatSize: 350, // width and height of scatterplot
  colorDem: d3.rgb(40, 50, 255), // color showing pure democratic vote
  colorRep: d3.rgb(230, 30, 20), // color showing pure democratic vote
  hexWidth: 52, // size of individual hexagons in US map
  hexScale: 1,  // hexagon scaling; 1 = edges touching
};

/* global bag of state; could be called "state" but that could be confusing with a US "state". The
  description "global bag of state" is a hint that this is not the cleanest design :) */
export const glob = {
  csvData: {}, // the results of d3.csv() data reads
  /* how the colormap mode is described in the UI.  NOTE: these identifiers
    'RVD', 'PUR', 'LVA' will not change; feel free to use them as magic constant strings throughout
    your code */
  modeDesc: {
    RVD: 'State winner',
    PUR: 'Partisan margin',
    LVA: 'Lean + vote total',
  },
  currentMode: null, // colormapping mode currently displayed
  currentYear: null, // election year currently displayed
  currentAbbrHide: false, // whether to hide state abbreviations in US map (toggled by 'd')
  scatContext: null, // "context" of scatterplot image canvas
  scatImage: null,   // underlying RGBA pixel data for scatterplot image canvas
}

// little utility functions, use or not as you see fit
export const lerp3 = function (a, b, w) {
  return (1 - w) * a + w * b;
};
export const lerp5 = function (y0, y1, x0, x, x1) {
  const w = (x - x0) / (x1 - x0);
  return (1 - w) * y0 + w * y1;
};
export const clamp = function (a, v, b) {
  return v < a ? a : v > b ? b : v;
};

// define, and export, anything else here that you want to use in p3
