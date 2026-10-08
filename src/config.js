// Your project settings.
//
// The colors here are the starting values. The control panel changes them
// while the sketch runs; this is just what it opens with.
//
// Colors are written as r, g, b, each one a number from 0 to 255.

// The name your exported images get — no spaces, no slashes.
//   'generative-typography'  ->  generative-typography-260921-1408.png
export const screenshotName = 'generative-typography';

// The font the sketch opens with, written the way it appears in the dropdown,
// which is the filename without the extension. Leave it as '' to use whichever
// font comes first alphabetically.
export const startingFont = 'Vollkorn-Black';

// The text the sketch opens with. You can change it in the panel while it runs.
export const startingText = 'O';

// Whether the code shows next to the drawing, in the lerp and Bézier steps.
export const showCode = true;

// Whether the last step, the letter, shows its code and how many of the
// font's curves are cubic, quadratic or straight.
export const showLetterCode = true;

// Whether the "anchor point / control point" legend shows above the code.
export const showLegend = true;

// How big everything is drawn: the points, text, lines and letter. 1.5 looks
// like the browser zoomed to 150%. Change it in the panel while it runs.
export const startingZoom = 1.5;

// Text sizes in pixels: the code, and the labels (point names, t, play,
// legend and the step counter).
export const codeSize = 12;
export const labelSize = 16;

// Line thickness in pixels: the curve in the Bézier steps, and the letter.
export const curveStrokeWeight = 3;
export const letterStrokeWeight = 8;

// The color the letter is drawn in, in the last step.
export const letterStrokeColor = { r: 250, g: 250, b: 250 };

export const backgroundColor = { r: 20, g: 20, b: 20 };
export const foregroundColor = { r: 250, g: 250, b: 250 };
