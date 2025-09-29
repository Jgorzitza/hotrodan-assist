export const calculateReorderPoint = ({ averageDailySales, leadTimeDays, safetyStock }) => {
    if (averageDailySales < 0 || leadTimeDays < 0 || safetyStock < 0) {
        throw new Error('Reorder point inputs must be non-negative');
    }
    return Math.ceil(averageDailySales * leadTimeDays + safetyStock);
};
export const calculateSafetyStock = (demandStdDev, leadTimeStdDev, serviceLevelFactor) => {
    if (demandStdDev < 0 || leadTimeStdDev < 0 || serviceLevelFactor < 0) {
        throw new Error('Safety stock inputs must be non-negative');
    }
    return Math.round(serviceLevelFactor * Math.sqrt(demandStdDev ** 2 + leadTimeStdDev ** 2));
};
