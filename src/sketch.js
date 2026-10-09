// START HERE.
//
// From a lerp to a cubic Bézier, one step at a time. Drag the points and the
// t slider. Change the step with the arrows under the title or the ← and →
// keys; space plays t.
//
// Two things to know:
//   setup()  runs once, at the start.
//   draw()   runs about 60 times a second, forever. Animation lives here.
//
// Note: this is p5 version 2. If you find a tutorial that uses `preload()`,
// it is written for p5 version 1 and will not work here. See the README.

import p5 from 'p5';
import { createGUI } from './lib/gui.js';
import { findPointAt } from './lib/drag.js';
import { applyFont, defaultFont, fontOptions, textToCurves, drawCurves, getCenter } from './lib/font/index.js';
import {
  startingText,
  showCode,
  showLetterCode,
  showLegend,
  startingZoom,
  codeSize,
  labelSize,
  curveStrokeWeight,
  letterStrokeWeight,
  letterStrokeColor,
  backgroundColor,
  foregroundColor,
} from './config.js';

// The values the control panel changes. The text and font are for the last
// step, the letter.
const params = {
  text: startingText,
  font: defaultFont,
  textSize: 550,
  zoom: startingZoom,
  foregroundColor,
  backgroundColor,
};

const STEPS = [
  { title: 'Interpolation == Mixing Values', showIntro: true },
  { title: 'lerp | mix values', showValues: true },
  { title: 'lerp | mix positions', pointCount: 2, lerpRounds: 1 },
  { title: 'Two lerps', pointCount: 3, lerpRounds: 1 },
  { title: 'Connect the lerps', pointCount: 3, lerpRounds: 2 },
  { title: 'Quadratic Bézier', pointCount: 3, lerpRounds: 2, showCurve: true },
  { title: 'Cubic Bézier', pointCount: 4, lerpRounds: 3, showCurve: true, showHandles: true },
  { title: 'Just the curve', pointCount: 4, showCurveOnly: true },
  { title: 'A letter is made of Béziers', showLetter: true, stopAtEnd: true },
  { title: 'What the font file stores', showTable: true },
];

const POINT_NAMES = ['A', 'B', 'C', 'D'];

// the title, arrows, labels and play button, whatever font the letter uses
const UI_FONT = 'Inter-Medium';

const anchorColor = { r: 204, g: 143, b: 41 };
const controlPointColor = { r: 41, g: 169, b: 204 };
const lineColor = { r: 110, g: 110, b: 110 };
// A to B and C to D in the cubic step: a darker blue than the control points,
// so they read as handles, as in Illustrator
const handleLineColor = { r: 30, g: 100, b: 125 };
// the letter's outline behind the numbered points in the last step
const outlineColor = { r: 170, g: 170, b: 170 };

// one color per round of lerps: AB, then ABC, then ABCD
const roundColors = [
  { r: 112, g: 176, b: 112 },
  { r: 204, g: 98, b: 143 },
  { r: 204, g: 182, b: 79 },
];

// The values step: a circle that turns from red to green, a square that grows
// and an arrow that turns, all three lerped by t.
const valueRed = { r: 220, g: 50, b: 50 };
const valueGreen = { r: 60, g: 190, b: 90 };
const valueSquareSize = { from: 40, to: 180 };
const valueAngle = { from: 0, to: 180 };
const VALUE_CIRCLE_SIZE = 150;
const VALUE_ARROW = { length: 160, thickness: 16, headSize: 50 };

// how far the left and right shape sit from the middle, and how far below
// the shapes their line of pseudocode sits
const VALUE_SPACING = 300;
const VALUE_LABEL_Y = 140;

// the intro's big line, and how far below it the small line sits
const INTRO_SIZE = 90;
const INTRO_LINE_GAP = 80;

const POINT_SIZE = 14;
const LETTER_POINT_SIZE = 7;
const GRAB_RADIUS = 20;
const TITLE_Y = 60;
const TITLE_SIZE = 40;
const NAVIGATION_Y = 105;

// the code's line spacing, as a multiple of its text size
const CODE_LINE_SPACING = 1.5;
const CODE_X = 40;
const CODE_Y = 170;
const LEGEND_Y = 130;
const SLIDER_BOTTOM = 70;
const KNOB_SIZE = 26;

// how far the ← and → under the title sit from the middle, in pixels
const ARROW_INNER = 30;
const ARROW_OUTER = 90;

// where the play button sits, measured left from the slider's start
const PLAY_INNER = 20;
const PLAY_OUTER = 90;

// where each column of the point table starts, measured from CODE_X
const TABLE_COLUMNS = { number: 0, kind: 40, x: 180, y: 240 };
const TABLE_POINT_SIZE = 5;

// how many straight pieces a curve is drawn with
const CURVE_RESOLUTION = 100;

// how long t takes from 0 to 1 when playing
const PLAY_SECONDS = 4;

let controlPoints = [];
let stepIndex = 0;
let t = 0;
let playing = false;
let draggedPoint = null;
let draggingSlider = false;
let currentFont = null;
let uiFont = null;

async function changeFont(url) {
  currentFont = await applyFont(url);
}

window.setup = async function setup() {
  createCanvas(windowWidth, windowHeight);

  //A, B, C and D, measured from the middle of the canvas
  controlPoints = [createVector(-300, 150), createVector(-150, -150), createVector(150, -150), createVector(300, 150)];

  //loading a font takes a moment, so we wait for it before drawing
  await changeFont(params.font);

  //falls back to the letter's font if Inter-Medium is not in the fonts folder
  const uiFontUrl = fontOptions[UI_FONT] || params.font;
  uiFont = await loadFont(uiFontUrl);
};

window.draw = function draw() {
  background(params.backgroundColor.r, params.backgroundColor.g, params.backgroundColor.b);
  const step = STEPS[stepIndex];
  if (playing) advanceT(step);

  //everything below is drawn bigger by the zoom, like zooming the browser
  push();
  scale(params.zoom);

  push();
  translate(zoomedWidth() / 2, zoomedHeight() / 2);
  if (step.showIntro) {
    drawIntroStep();
  } else if (step.showValues) {
    drawValuesStep();
  } else if (step.showLetter) {
    drawLetterStep();
  } else if (step.showTable) {
    drawFontPoints();
  } else if (step.showCurveOnly) {
    drawCurveOnlyStep(step);
  } else {
    drawLerpStep(step);
  }
  pop();

  drawTitle(step);
  drawLegend(step);
  if (step.showLetter && !showLetterCode) {
    drawFontInfo();
  } else if (step.showTable) {
    drawPointTable();
  } else {
    drawCode(codeLines(step));
  }
  if (hasSlider(step)) drawSlider();
  pop();

  updateCursor();
};

// The canvas size and the mouse, measured in zoomed pixels. With a zoom of 2
// the canvas holds half as many of them, so the layout and the mouse use
// these instead of width, height, mouseX and mouseY.
function zoomedWidth() {
  return width / params.zoom;
}

function zoomedHeight() {
  return height / params.zoom;
}

function zoomedMouseX() {
  return mouseX / params.zoom;
}

function zoomedMouseY() {
  return mouseY / params.zoom;
}

// The first step: only the word, before any example.
function drawIntroStep() {
  noStroke();
  fill(params.foregroundColor.r, params.foregroundColor.g, params.foregroundColor.b);
  if (uiFont) textFont(uiFont);
  textAlign(CENTER, CENTER);
  textSize(INTRO_SIZE);
  text('lerp == mixing', 0, 0);

  fill(lineColor.r, lineColor.g, lineColor.b);
  textSize(labelSize);
  text('short for linear interpolation a mix of two things, by an amount t', 0, INTRO_LINE_GAP);
}

// lerp mixes any two values, not only positions: a color, a size, an angle.
// Each shape stays where it is; only the one value changes with t.
function drawValuesStep() {
  noStroke();
  rectMode(CENTER);

  //color
  const redColor = color(valueRed.r, valueRed.g, valueRed.b);
  const greenColor = color(valueGreen.r, valueGreen.g, valueGreen.b);
  //lerpColor mixes in the current color mode. In RGB the middle is a muddy
  //brown; in HSB the hue turns from red through orange and yellow to green
  colorMode(HSB);
  fill(lerpColor(redColor, greenColor, t));
  colorMode(RGB);
  circle(-VALUE_SPACING, 0, VALUE_CIRCLE_SIZE);

  //size
  const squareSize = lerp(valueSquareSize.from, valueSquareSize.to, t);
  fill(params.foregroundColor.r, params.foregroundColor.g, params.foregroundColor.b);
  square(0, 0, squareSize);

  //rotation
  push();
  translate(VALUE_SPACING, 0);
  rotate(radians(lerp(valueAngle.from, valueAngle.to, t)));
  //pointing right at 0°: a shaft, then a triangle for the head
  const tip = VALUE_ARROW.length / 2;
  const headStart = tip - VALUE_ARROW.headSize;
  rect(-VALUE_ARROW.headSize / 2, 0, VALUE_ARROW.length - VALUE_ARROW.headSize, VALUE_ARROW.thickness);
  triangle(headStart, -VALUE_ARROW.headSize / 2, tip, 0, headStart, VALUE_ARROW.headSize / 2);
  pop();

  rectMode(CORNER);

  if (uiFont) textFont(uiFont);
  textAlign(CENTER, TOP);
  textSize(labelSize);
  text('lerpColor(red, green, t)', -VALUE_SPACING, VALUE_LABEL_Y);
  text('lerp(small, big, t)', 0, VALUE_LABEL_Y);
  text('lerp(0°, 180°, t)', VALUE_SPACING, VALUE_LABEL_Y);
}

function drawLerpStep(step) {
  const points = controlPoints.slice(0, step.pointCount);
  const rounds = lerpRounds(points, t, step.lerpRounds);
  const names = roundNames(step.pointCount, step.lerpRounds);

  //the lines each round of lerps slides along
  for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
    const lineStroke = roundIndex === 0 ? lineColor : roundColors[roundIndex - 1];
    drawLines(rounds[roundIndex], lineStroke);
  }

  //drawn over the grey lines, which leaves only B to C grey
  if (step.showHandles) {
    const last = points.length - 1;
    drawLines([points[0], points[1]], handleLineColor);
    drawLines([points[last - 1], points[last]], handleLineColor);
  }

  if (step.showCurve) {
    drawCurveUpTo(points, t, roundColors[step.lerpRounds - 1], curveStrokeWeight);
  }

  points.forEach((position, index) => {
    const isAnchor = index === 0 || index === points.length - 1;
    drawDot(position, isAnchor ? anchorColor : controlPointColor, names[0][index]);
  });

  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex++) {
    rounds[roundIndex].forEach((position, index) => {
      drawDot(position, roundColors[roundIndex - 1], names[roundIndex][index]);
    });
  }
}

// The cubic Bézier with all the lerps taken away: the whole curve, its four
// points, unlabelled, and the handles. t is fixed at 1 here, so the curve is always complete.
function drawCurveOnlyStep(step) {
  const points = controlPoints.slice(0, step.pointCount);
  //the handles, A to B and C to D, as in Illustrator
  drawLines([points[0], points[1]], handleLineColor);
  drawLines([points[2], points[3]], handleLineColor);

  //the yellow of the last round of lerps, as in the Cubic Bézier step
  drawCurveUpTo(points, 1, roundColors[2], curveStrokeWeight);

  points.forEach((position, index) => {
    const isAnchor = index === 0 || index === points.length - 1;
    drawDot(position, isAnchor ? anchorColor : controlPointColor, '');
  });
}

// Every round of lerps, from the points down to fewer points:
// [[A, B, C, D], [AB, BC, CD], [ABC, BCD], [ABCD]]
function lerpRounds(points, amount, roundCount) {
  const rounds = [points];
  for (let roundIndex = 1; roundIndex <= roundCount; roundIndex++) {
    const previous = rounds[roundIndex - 1];
    const next = [];
    for (let index = 0; index < previous.length - 1; index++) {
      next.push(p5.Vector.lerp(previous[index], previous[index + 1], amount));
    }
    rounds.push(next);
  }
  return rounds;
}

// The names that go with lerpRounds(): [['A', 'B', 'C'], ['AB', 'BC'], ['ABC']]
function roundNames(pointCount, roundCount) {
  const names = [POINT_NAMES.slice(0, pointCount)];
  for (let roundIndex = 1; roundIndex <= roundCount; roundIndex++) {
    const previous = names[roundIndex - 1];
    const next = [];
    for (let index = 0; index < previous.length - 1; index++) {
      next.push(previous[index] + previous[index + 1].slice(-1));
    }
    names.push(next);
  }
  return names;
}

// Lerps until one point is left: the point on the curve at `amount`.
function pointOnCurve(points, amount) {
  const rounds = lerpRounds(points, amount, points.length - 1);
  return rounds[rounds.length - 1][0];
}

function drawCurveUpTo(points, endAmount, curveColor, curveWeight) {
  noFill();
  stroke(curveColor.r, curveColor.g, curveColor.b);
  strokeWeight(curveWeight);
  beginShape();
  for (let index = 0; index <= CURVE_RESOLUTION; index++) {
    const position = pointOnCurve(points, (index / CURVE_RESOLUTION) * endAmount);
    vertex(position.x, position.y);
  }
  endShape();
}

function drawLines(points, lineStroke, lineWeight = 2) {
  stroke(lineStroke.r, lineStroke.g, lineStroke.b);
  strokeWeight(lineWeight);
  for (let index = 0; index < points.length - 1; index++) {
    line(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
  }
}

function drawDot(position, dotColor, label, dotSize = POINT_SIZE) {
  noStroke();
  fill(dotColor.r, dotColor.g, dotColor.b);
  circle(position.x, position.y, dotSize);
  if (!label) return;

  if (uiFont) textFont(uiFont);
  textAlign(LEFT, BOTTOM);
  textSize(labelSize);
  text(label, position.x + POINT_SIZE, position.y - POINT_SIZE / 2);
}

function drawLetterStep() {
  if (!currentFont) return;

  textFont(currentFont);
  textAlign(CENTER, CENTER);
  textSize(params.textSize);
  const letters = textToCurves(currentFont, params.text, 0, 0);

  const curvesAsPoints = letters
    .flat(2)
    .map((curve) => [curve.from, ...curve.controls, curve.to].map((position) => createVector(position.x, position.y)));

  //every curve drawn like A, B, C and D in the steps before, only smaller:
  //its points and its lerps at t
  for (const points of curvesAsPoints) {
    const rounds = lerpRounds(points, t, points.length - 1);

    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
      const lineStroke = roundIndex === 0 ? lineColor : roundColors[roundIndex - 1];
      drawLines(rounds[roundIndex], lineStroke, 1);
    }

    points.forEach((position, index) => {
      const isAnchor = index === 0 || index === points.length - 1;
      drawDot(position, isAnchor ? anchorColor : controlPointColor, '', LETTER_POINT_SIZE);
    });

    for (let roundIndex = 1; roundIndex < rounds.length; roundIndex++) {
      for (const position of rounds[roundIndex]) {
        drawDot(position, roundColors[roundIndex - 1], '', LETTER_POINT_SIZE);
      }
    }
  }

  //the curves up to t last, so they sit in front of every point and line
  for (const points of curvesAsPoints) {
    drawCurveUpTo(points, t, letterStrokeColor, letterStrokeWeight);
  }
}

function codeLines(step) {
  const lines = [{ code: `let t = ${nf(t, 1, 2)};`, color: params.foregroundColor, comment: ` // ${round(t * 100)}%` }];

  //src/config.js decides which steps show their code
  if (!step.showLetter && !showCode) return [];
  //the intro has no code, the values step has its pseudocode under the shapes,
  //and the curve-only step shows nothing but the curve
  if (step.showIntro || step.showValues || step.showCurveOnly) return [];
  if (step.showLetter) {
    lines.push({ code: `let letters = textToCurves(font, '${params.text}', 0, 0);`, color: params.foregroundColor });
    lines.push({ code: 'for (let curve of letters.flat(2)) {', color: params.foregroundColor });
    lines.push({ code: '  let points = [curve.from, ...curve.controls, curve.to];', color: params.foregroundColor });
    lines.push({ code: '  let onCurve = pointOnCurve(points, t);', color: roundColors[2] });
    lines.push({ code: '}', color: params.foregroundColor });
    lines.push({ code: '// pointOnCurve() does the lerps from the Cubic Bézier step', color: lineColor });
    lines.push({ code: '', color: lineColor });
    lines.push({ code: `// ${curveCountLine()}`, color: lineColor });
    return lines;
  }

  const names = roundNames(step.pointCount, step.lerpRounds);
  for (let roundIndex = 1; roundIndex < names.length; roundIndex++) {
    names[roundIndex].forEach((name, index) => {
      const from = names[roundIndex - 1][index];
      const to = names[roundIndex - 1][index + 1];
      lines.push({ code: `let ${name} = p5.Vector.lerp(${from}, ${to}, t);`, color: roundColors[roundIndex - 1] });
    });
  }
  return lines;
}

// How many of the letter's curves are straight, quadratic or cubic, going by
// their number of handles. TrueType fonts (.ttf) only have quadratic curves.
function countCurves() {
  const counts = { straight: 0, quadratic: 0, cubic: 0 };
  const kinds = ['straight', 'quadratic', 'cubic'];
  for (const curve of textToCurves(currentFont, params.text, 0, 0).flat(2)) {
    counts[kinds[curve.controls.length]]++;
  }
  return counts;
}

function curveCountLine() {
  if (!currentFont) return '';
  const counts = countCurves();
  return `${fontName()}: ${counts.cubic} cubic, ${counts.quadratic} quadratic, ${counts.straight} straight`;
}

function fontName() {
  return Object.keys(fontOptions).find((name) => fontOptions[name] === params.font);
}

// .otf files usually store cubic Béziers, .ttf files quadratic ones. The file
// ending is read from the font's url, e.g. '/fonts/Vollkorn-Black.otf'.
function fontFileType() {
  const ending = params.font.split('.').pop().toLowerCase();
  if (ending === 'ttf') return { ending, name: 'TrueType', curves: 'quadratic Béziers: 1 control point' };
  return { ending, name: 'OpenType', curves: 'cubic Béziers: 2 control points' };
}

// Left of the letter, in place of the code: the font's file type and how many
// curves of each kind the letter has.
function drawFontInfo() {
  if (!currentFont) return;

  const fileType = fontFileType();
  const counts = countCurves();
  const lines = [
    { label: `${fontName()}.${fileType.ending}`, color: params.foregroundColor },
    { label: `${fileType.name}, stores ${fileType.curves}`, color: lineColor },
    { label: '', color: lineColor },
    { label: `${counts.cubic} cubic`, color: params.foregroundColor },
    { label: `${counts.quadratic} quadratic`, color: params.foregroundColor },
    { label: `${counts.straight} straight`, color: params.foregroundColor },
  ];

  noStroke();
  if (uiFont) textFont(uiFont);
  textAlign(LEFT, TOP);
  textSize(labelSize);
  lines.forEach((infoLine, index) => {
    fill(infoLine.color.r, infoLine.color.g, infoLine.color.b);
    text(infoLine.label, CODE_X, CODE_Y + index * labelSize * CODE_LINE_SPACING);
  });
}

// The points of the first letter, as the font file stores them: in font
// units, with y = 0 on the baseline and y going up. Read at a text size of
// one em, so one unit of the path is one unit of the font.
function fontContours() {
  const character = params.text.trim()[0];
  if (!currentFont || !character) return [];

  push();
  textFont(currentFont);
  textAlign(LEFT, BASELINE);
  textSize(currentFont.data.head.unitsPerEm);
  const contours = textToCurves(currentFont, character, 0, 0).flat();
  pop();
  return contours;
}

function fontPoints(contours) {
  //each anchor and control point once, in the order the file lists them; the
  //last curve ends where the first began, so its end is left out
  const points = [];
  contours.forEach((contour, contourIndex) => {
    points.push({ position: contour[0].from, isAnchor: true, contourIndex });
    contour.forEach((curve, curveIndex) => {
      for (const control of curve.controls) {
        points.push({ position: control, isAnchor: false, contourIndex });
      }
      if (curveIndex < contour.length - 1) points.push({ position: curve.to, isAnchor: true, contourIndex });
    });
  });
  return points;
}

// The first letter, drawn from fontPoints() at the panel's size, each point
// numbered like its row in the table.
function drawFontPoints() {
  const contours = fontContours();
  const points = fontPoints(contours);
  if (points.length === 0) return;

  //font units to pixels, with the letter's middle at the canvas' middle
  const pixelsPerUnit = params.textSize / currentFont.data.head.unitsPerEm;
  const center = getCenter(points.map((point) => point.position));
  const onScreen = points.map((point) =>
    createVector((point.position.x - center.x) * pixelsPerUnit, (point.position.y - center.y) * pixelsPerUnit),
  );

  //the outline, so the points have something to sit on. It is drawn in font
  //units and scaled down, so the stroke is scaled up by the same amount to
  //stay 2 pixels thick
  push();
  noFill();
  stroke(outlineColor.r, outlineColor.g, outlineColor.b);
  strokeWeight(2 / pixelsPerUnit);
  scale(pixelsPerUnit);
  translate(-center.x, -center.y);
  drawCurves([contours]);
  pop();

  if (uiFont) textFont(uiFont);
  textAlign(LEFT, BOTTOM);
  textSize(codeSize);
  points.forEach((point, index) => {
    drawDot(onScreen[index], point.isAnchor ? anchorColor : controlPointColor, '', LETTER_POINT_SIZE);
    fill(params.foregroundColor.r, params.foregroundColor.g, params.foregroundColor.b);
    text(index + 1, onScreen[index].x + LETTER_POINT_SIZE, onScreen[index].y - LETTER_POINT_SIZE / 2);
  });
}

// The table left of the letter: one row per point, as many as fit.
function drawPointTable() {
  const points = fontPoints(fontContours());
  if (points.length === 0) return;

  const rowHeight = codeSize * CODE_LINE_SPACING;
  const rows = [];
  points.forEach((point, index) => {
    //a new contour gets its own heading row; the second one in "O" is the counter
    if (index === 0 || point.contourIndex !== points[index - 1].contourIndex) {
      rows.push({ heading: `contour ${point.contourIndex + 1}` });
    }
    rows.push({ point, number: index + 1 });
  });

  const headerLines = [
    `unitsPerEm ${currentFont.data.head.unitsPerEm}, baseline at y = 0, y goes up`,
    `${points.length} points`,
  ];

  noStroke();
  textFont('monospace');
  textSize(codeSize);
  fill(lineColor.r, lineColor.g, lineColor.b);
  textAlign(LEFT, TOP);
  headerLines.forEach((headerLine, index) => text(headerLine, CODE_X, CODE_Y + index * rowHeight));

  const tableTop = CODE_Y + (headerLines.length + 1) * rowHeight;
  const rowsThatFit = floor((zoomedHeight() - SLIDER_BOTTOM - tableTop) / rowHeight);
  const visibleRows = rows.slice(0, rowsThatFit);
  if (rowsThatFit > 0 && rows.length > rowsThatFit)
    visibleRows[rowsThatFit - 1] = { heading: `${rows.length - rowsThatFit + 1} more rows` };

  drawTableRow({ number: '#', kind: 'point', x: 'x', y: 'y' }, tableTop - rowHeight, lineColor);
  visibleRows.forEach((row, index) => {
    const y = tableTop + index * rowHeight;
    if (row.heading) {
      fill(lineColor.r, lineColor.g, lineColor.b);
      textAlign(LEFT, TOP);
      text(row.heading, CODE_X, y);
      return;
    }

    const dotColor = row.point.isAnchor ? anchorColor : controlPointColor;
    drawDot(
      createVector(CODE_X + TABLE_COLUMNS.kind - TABLE_POINT_SIZE * 2, y + codeSize / 2),
      dotColor,
      '',
      TABLE_POINT_SIZE,
    );
    //+ 0 turns -0 into 0
    const cells = {
      number: row.number,
      kind: row.point.isAnchor ? 'anchor' : 'control',
      x: round(row.point.position.x) + 0,
      y: round(-row.point.position.y) + 0,
    };
    drawTableRow(cells, y, params.foregroundColor);
  });
}

// Names on the left of their column, numbers on the right, so the digits line up.
function drawTableRow(cells, y, rowColor) {
  noStroke();
  textFont('monospace');
  textSize(codeSize);
  fill(rowColor.r, rowColor.g, rowColor.b);
  textAlign(LEFT, TOP);
  text(cells.number, CODE_X + TABLE_COLUMNS.number, y);
  text(cells.kind, CODE_X + TABLE_COLUMNS.kind, y);
  textAlign(RIGHT, TOP);
  text(cells.x, CODE_X + TABLE_COLUMNS.x, y);
  text(cells.y, CODE_X + TABLE_COLUMNS.y, y);
}

// Which dot is which, above the code. The curve starts and ends on anchor
// points; control points pull it towards them without it touching them.
function drawLegend(step) {
  //the intro and the values step have no points, so nothing to explain, and
  //the curve-only step shows nothing but the curve
  if (!showLegend || step.showIntro || step.showValues || step.showCurveOnly) return;

  const hasControlPoints = step.showLetter || step.showTable || step.pointCount > 2;
  const entries = [{ label: 'anchor point', dotColor: anchorColor }];
  if (hasControlPoints) entries.push({ label: 'control point', dotColor: controlPointColor });

  if (uiFont) textFont(uiFont);
  textSize(labelSize);
  textAlign(LEFT, CENTER);

  let x = CODE_X;
  for (const entry of entries) {
    drawDot(createVector(x + POINT_SIZE / 2, LEGEND_Y), entry.dotColor, '');
    fill(params.foregroundColor.r, params.foregroundColor.g, params.foregroundColor.b);
    text(entry.label, x + POINT_SIZE * 1.5, LEGEND_Y);
    x += POINT_SIZE * 1.5 + textWidth(entry.label) + POINT_SIZE * 2;
  }
}

function drawCode(lines) {
  noStroke();
  textFont('monospace');
  textAlign(LEFT, TOP);
  textSize(codeSize);
  lines.forEach((codeLine, index) => {
    const y = CODE_Y + index * codeSize * CODE_LINE_SPACING;
    fill(codeLine.color.r, codeLine.color.g, codeLine.color.b);
    text(codeLine.code, CODE_X, y);

    //a comment at the end of a line is grey, like the comment lines
    if (codeLine.comment) {
      fill(lineColor.r, lineColor.g, lineColor.b);
      text(codeLine.comment, CODE_X + textWidth(codeLine.code), y);
    }
  });
}

function drawTitle(step) {
  noStroke();
  fill(params.foregroundColor.r, params.foregroundColor.g, params.foregroundColor.b);
  if (uiFont) textFont(uiFont);
  textAlign(CENTER, CENTER);

  textSize(TITLE_SIZE);
  text(step.title, zoomedWidth() / 2, TITLE_Y);

  textSize(labelSize);
  text(`←     ${stepIndex + 1} / ${STEPS.length}     →`, zoomedWidth() / 2, NAVIGATION_Y);
}

function isOverPrevious(x, y) {
  return (
    abs(y - NAVIGATION_Y) < GRAB_RADIUS && x > zoomedWidth() / 2 - ARROW_OUTER && x < zoomedWidth() / 2 - ARROW_INNER
  );
}

function isOverNext(x, y) {
  return (
    abs(y - NAVIGATION_Y) < GRAB_RADIUS && x > zoomedWidth() / 2 + ARROW_INNER && x < zoomedWidth() / 2 + ARROW_OUTER
  );
}

//every step starts at t = 0 and paused
function changeStep(direction) {
  const nextIndex = constrain(stepIndex + direction, 0, STEPS.length - 1);
  if (nextIndex === stepIndex) return;
  stepIndex = nextIndex;
  t = 0;
  playing = false;
}

//half the slider's length: 225 pixels, or less on a narrow window
function sliderHalfLength() {
  return min(225, zoomedWidth() * 0.225);
}

function sliderLeft() {
  return zoomedWidth() / 2 - sliderHalfLength();
}

function sliderRight() {
  return zoomedWidth() / 2 + sliderHalfLength();
}

function sliderY() {
  return zoomedHeight() - SLIDER_BOTTOM;
}

function drawSlider() {
  stroke(lineColor.r, lineColor.g, lineColor.b);
  strokeWeight(4);
  line(sliderLeft(), sliderY(), sliderRight(), sliderY());

  //the knob sits at t between the two ends: a lerp too
  const knobX = lerp(sliderLeft(), sliderRight(), t);
  noStroke();
  fill(params.foregroundColor.r, params.foregroundColor.g, params.foregroundColor.b);
  circle(knobX, sliderY(), KNOB_SIZE);

  if (uiFont) textFont(uiFont);
  textSize(labelSize);
  textAlign(CENTER, BOTTOM);
  text(`t = ${nf(t, 1, 2)}`, knobX, sliderY() - KNOB_SIZE);

  textAlign(RIGHT, CENTER);
  text(playing ? 'pause' : 'play', sliderLeft() - PLAY_INNER, sliderY());
}

// The intro has no t yet, the table has no t at all, and the curve-only step
// keeps t at 1, so none of them has a slider.
function hasSlider(step) {
  return !step.showIntro && !step.showTable && !step.showCurveOnly;
}

function isOverSlider(x, y) {
  if (!hasSlider(STEPS[stepIndex])) return false;
  return abs(y - sliderY()) < GRAB_RADIUS && x > sliderLeft() - GRAB_RADIUS && x < sliderRight() + GRAB_RADIUS;
}

function isOverPlay(x, y) {
  if (!hasSlider(STEPS[stepIndex])) return false;
  return abs(y - sliderY()) < GRAB_RADIUS && x > sliderLeft() - PLAY_OUTER && x < sliderLeft() - PLAY_INNER;
}

function setTFromMouse() {
  t = constrain(map(zoomedMouseX(), sliderLeft(), sliderRight(), 0, 1), 0, 1);
}

// The point under the mouse, measured from the middle like the points are.
function controlPointUnderMouse() {
  const step = STEPS[stepIndex];
  //only the lerp and Bézier steps have points to drag
  if (!step.pointCount) return null;
  const points = controlPoints.slice(0, step.pointCount);
  return findPointAt(points, zoomedMouseX() - zoomedWidth() / 2, zoomedMouseY() - zoomedHeight() / 2, GRAB_RADIUS);
}

// Moves t on by one frame. Most steps loop back to 0; a step with stopAtEnd
// stops at t = 1, so the letter is left fully drawn.
function advanceT(step) {
  t += deltaTime / 1000 / PLAY_SECONDS;
  if (t < 1) return;

  if (step.stopAtEnd) {
    t = 1;
    playing = false;
  } else {
    t = t % 1;
  }
}

// Pressing play at the end starts again from 0.
function togglePlaying() {
  if (!playing && t >= 1) t = 0;
  playing = !playing;
}

window.mousePressed = function mousePressed(event) {
  //the control panel sits on top of the canvas, so clicks on it are ignored
  if (event.target.tagName !== 'CANVAS') return;

  if (isOverPrevious(zoomedMouseX(), zoomedMouseY())) return changeStep(-1);
  if (isOverNext(zoomedMouseX(), zoomedMouseY())) return changeStep(1);

  if (isOverPlay(zoomedMouseX(), zoomedMouseY())) {
    togglePlaying();
    return;
  }

  if (isOverSlider(zoomedMouseX(), zoomedMouseY())) {
    draggingSlider = true;
    playing = false;
    setTFromMouse();
    return;
  }

  draggedPoint = controlPointUnderMouse();
};

window.mouseDragged = function mouseDragged() {
  if (draggingSlider) setTFromMouse();
  if (draggedPoint) draggedPoint.set(zoomedMouseX() - zoomedWidth() / 2, zoomedMouseY() - zoomedHeight() / 2);
};

window.mouseReleased = function mouseReleased() {
  draggingSlider = false;
  draggedPoint = null;
};

function updateCursor() {
  const overSomething =
    draggedPoint ||
    draggingSlider ||
    controlPointUnderMouse() ||
    isOverSlider(zoomedMouseX(), zoomedMouseY()) ||
    isOverPlay(zoomedMouseX(), zoomedMouseY()) ||
    isOverPrevious(zoomedMouseX(), zoomedMouseY()) ||
    isOverNext(zoomedMouseX(), zoomedMouseY());
  cursor(overSomething ? HAND : ARROW);
}

window.keyPressed = function keyPressed(event) {
  //typing in the panel's text field should not change the step
  if (event.target.tagName === 'INPUT') return;

  if (keyCode === LEFT_ARROW) changeStep(-1);
  if (keyCode === RIGHT_ARROW) changeStep(1);
  if (key === ' ' && hasSlider(STEPS[stepIndex])) togglePlaying();
};

window.windowResized = function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
};

// Builds the control panel, then starts p5. p5 looks for the setup() and
// draw() you defined above and runs them.
function addControls(gui) {
  gui.add(params, 'zoom', 0.5, 3, 0.1);
}

createGUI({ params, onFontChange: changeFont, addControls });
new p5();
