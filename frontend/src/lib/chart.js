const WIDTH = 760;
const HEIGHT = 260;
const LEFT = 62;
const RIGHT = 20;
const TOP = 19;
const BOTTOM = 35;

export function buildSeries(readings, metric) {
  const isTemp = metric === 'temperature_c';
  const isLux = metric === 'luminosity_lux';
  const palette = isTemp
    ? { color: '#d99612', fill: '#f4bd4d', unit: '°C' }
    : isLux
      ? { color: '#e68a00', fill: '#f6c75a', unit: ' lx' }
      : { color: '#378e87', fill: '#72b9ad', unit: '%' };

  const values = readings.map((row) => Number(row[metric])).filter(Number.isFinite);
  if (!values.length) return { empty: true, ...palette };

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 0.1) {
    min -= isTemp ? 0.5 : (isLux ? 50 : 1);
    max += isTemp ? 0.5 : (isLux ? 50 : 1);
  } else {
    const pad = (max - min) * 0.16;
    min -= pad;
    max += pad;
  }
  if (min < 0 && (isLux || !isTemp)) min = 0;

  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const xAt = (index) => LEFT + (readings.length === 1 ? plotWidth / 2 : (index * plotWidth) / (readings.length - 1));
  const yAt = (value) => TOP + ((max - value) * plotHeight) / (max - min);

  const points = readings.map((row, index) => ({
    x: xAt(index),
    y: yAt(Number(row[metric])),
    value: Number(row[metric]),
    time: row.timestamp,
  })).filter((point) => Number.isFinite(point.y));

  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const baseline = (TOP + plotHeight).toFixed(1);
  const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;

  const grid = Array.from({ length: 4 }, (_, index) => {
    const value = max - ((max - min) * index) / 3;
    const y = TOP + (plotHeight * index) / 3;
    const label = isLux ? value.toFixed(0) : value.toFixed(isTemp ? 1 : 0);
    return { y, label: `${label}${palette.unit}` };
  });

  return {
    empty: false,
    ...palette,
    width: WIDTH,
    height: HEIGHT,
    left: LEFT,
    right: RIGHT,
    grid,
    line,
    area,
    points,
    digits: isLux ? 0 : 1,
    firstTime: readings[0]?.timestamp,
    lastTime: readings[readings.length - 1]?.timestamp,
  };
}
