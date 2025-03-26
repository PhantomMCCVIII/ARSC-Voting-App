export const SCHOOL_LEVELS = [
  {
    value: "elementary",
    label: "Elementary",
    grades: [3, 4, 5, 6],
  },
  {
    value: "juniorHigh",
    label: "Junior High School",
    grades: [7, 8, 9, 10],
  },
  {
    value: "seniorHigh",
    label: "Senior High School",
    grades: [11, 12],
  },
];

export const GRADE_LEVELS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const getGradesBySchoolLevel = (schoolLevel: string): number[] => {
  const level = SCHOOL_LEVELS.find((level) => level.value === schoolLevel);
  return level?.grades || [];
};

export const getSchoolLevelLabel = (value: string): string => {
  const level = SCHOOL_LEVELS.find((level) => level.value === value);
  return level?.label || value;
};

export const DEFAULT_AVATAR_COLORS = [
  "#f44336", // Red
  "#e91e63", // Pink
  "#9c27b0", // Purple
  "#673ab7", // Deep Purple
  "#3f51b5", // Indigo 
  "#2196f3", // Blue
  "#03a9f4", // Light Blue
  "#00bcd4", // Cyan
  "#009688", // Teal
  "#4caf50", // Green
  "#8bc34a", // Light Green
  "#cddc39", // Lime
  "#ffc107", // Amber
  "#ff9800", // Orange
  "#ff5722", // Deep Orange
];

export const getColorForName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_AVATAR_COLORS.length;
  return DEFAULT_AVATAR_COLORS[index];
};
