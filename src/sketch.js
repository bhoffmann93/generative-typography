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
import { applyFont, defaultFont, fontOptions, textToCurves } from './lib/font/index.js';
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
  { title: 'lerp | mix', pointCount: 2, lerpRounds: 1 },
  { title: 'Two lerps', pointCount: 3, lerpRounds: 1 },
  { title: 'Connect the lerps', pointCount: 3, lerpRounds: 2 },
  { title: 'Quadratic Bézier', pointCount: 3, lerpRounds: 2, showCurve: true },
  { title: 'Cubic Bézier', pointCount: 4, lerpRounds: 3, showCurve: true, showHandles: true },
  { title: 'A letter is made of Béziers', showLetter: true, stopAtEnd: true },
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

// one color per round of lerps: AB, then ABC, then ABCD
const roundColors = [
  { r: 112, g: 176, b: 112 },
  { r: 204, g: 98, b: 143 },
  { r: 204, g: 182, b: 79 },
];

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
  if (step.showLetter) {
    drawLetterStep();
  } else {
    drawLerpStep(step);
  }
  pop();

  drawTitle(step);
  drawLegend(step);
  drawCode(codeLines(step));
  drawSlider();
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
  if (step.showLetter) {
    if (!showLetterCode) return [];
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
function curveCountLine() {
  if (!currentFont) return '';

  const counts = { straight: 0, quadratic: 0, cubic: 0 };
  const kinds = ['straight', 'quadratic', 'cubic'];
  for (const curve of textToCurves(currentFont, params.text, 0, 0).flat(2)) {
    counts[kinds[curve.controls.length]]++;
  }

  const fontName = Object.keys(fontOptions).find((name) => fontOptions[name] === params.font);
  return `${fontName}: ${counts.cubic} cubic, ${counts.quadratic} quadratic, ${counts.straight} straight`;
}

// Which dot is which, above the code. The curve starts and ends on anchor
// points; control points pull it towards them without it touching them.
function drawLegend(step) {
  if (!showLegend) return;

  const hasControlPoints = step.showLetter || step.pointCount > 2;
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

function isOverSlider(x, y) {
  return abs(y - sliderY()) < GRAB_RADIUS && x > sliderLeft() - GRAB_RADIUS && x < sliderRight() + GRAB_RADIUS;
}

function isOverPlay(x, y) {
  return abs(y - sliderY()) < GRAB_RADIUS && x > sliderLeft() - PLAY_OUTER && x < sliderLeft() - PLAY_INNER;
}

function setTFromMouse() {
  t = constrain(map(zoomedMouseX(), sliderLeft(), sliderRight(), 0, 1), 0, 1);
}

// The point under the mouse, measured from the middle like the points are.
function controlPointUnderMouse() {
  const step = STEPS[stepIndex];
  if (step.showLetter) return null;
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
  if (key === ' ') togglePlaying();
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
