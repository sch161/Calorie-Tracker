export const calorieTable = {
    male: [
        { min: 1, max: 2, diet: 400, keep: 900, bulkUp: 1300 },
        { min: 3, max: 5, diet: 900, keep: 1400, bulkUp: 1800 },
        { min: 6, max: 8, diet: 1200, keep: 1700, bulkUp: 2100 },
        { min: 9, max: 11, diet: 1500, keep: 2000, bulkUp: 2400 },
        { min: 12, max: 14, diet: 2000, keep: 2500, bulkUp: 2900 },
        { min: 15, max: 18, diet: 2200, keep: 2700, bulkUp: 3100 },
        { min: 19, max: 29, diet: 2100, keep: 2600, bulkUp: 3000 },
        { min: 30, max: 49, diet: 2000, keep: 2500, bulkUp: 2900 },
        { min: 50, max: 64, diet: 1700, keep: 2200, bulkUp: 2600 },
        { min: 65, max: 74, diet: 1500, keep: 2000, bulkUp: 2400 },
        { min: 75, max: 999, diet: 1500, keep: 2000, bulkUp: 2400 },
    ],
    female: [
        { min: 1, max: 2, diet: 400, keep: 900, bulkUp: 1300 },
        { min: 3, max: 5, diet: 900, keep: 1400, bulkUp: 1800 },
        { min: 6, max: 8, diet: 1000, keep: 1500, bulkUp: 1900 },
        { min: 9, max: 11, diet: 1300, keep: 1800, bulkUp: 2200 },
        { min: 12, max: 14, diet: 1500, keep: 2000, bulkUp: 2400 },
        { min: 15, max: 18, diet: 1500, keep: 2000, bulkUp: 2400 },
        { min: 19, max: 29, diet: 1500, keep: 2000, bulkUp: 2400 },
        { min: 30, max: 49, diet: 1400, keep: 1900, bulkUp: 2300 },
        { min: 50, max: 64, diet: 1300, keep: 1800, bulkUp: 2200 },
        { min: 65, max: 74, diet: 1100, keep: 1600, bulkUp: 2000 },
        { min: 75, max: 999, diet: 1100, keep: 1600, bulkUp: 2000 },
    ],
};

export function getRecommendedKcal(age, genderCode, goalKey) {
    const genderTable = genderCode === 1 ? calorieTable.male : calorieTable.female;
    const bracket = genderTable.find((row) => age >= row.min && age <= row.max);
    return bracket ? bracket[goalKey] : null;
}