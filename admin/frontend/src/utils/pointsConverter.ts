export const POINTS_TO_ZAR_RATIO = 0.1; // 100 points = 10 ZAR

export const pointsToZAR = (points: number): number => {
  return points * POINTS_TO_ZAR_RATIO;
};

export const ZARtoPoints = (zar: number): number => {
  return Math.round(zar / POINTS_TO_ZAR_RATIO);
}; 