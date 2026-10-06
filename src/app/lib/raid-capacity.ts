export type RaidLevel = "0" | "1" | "5" | "6" | "10";

const minimumDriveCount: Readonly<Record<RaidLevel, number>> = { "0": 2, "1": 2, "5": 3, "6": 4, "10": 4 };

export function calculateRaidUsableCapacity(level: RaidLevel, driveCapacitiesTb: readonly number[]) {
  if (driveCapacitiesTb.some((capacity) => !Number.isFinite(capacity) || capacity <= 0)) {
    throw new Error("Laufwerkskapazitäten müssen positive Zahlen sein.");
  }
  if (driveCapacitiesTb.length < minimumDriveCount[level]) {
    throw new Error(`RAID ${level} benötigt mindestens ${minimumDriveCount[level]} Laufwerke.`);
  }
  if (level === "10" && driveCapacitiesTb.length % 2 !== 0) {
    throw new Error("RAID 10 benötigt eine gerade Anzahl Laufwerke für Spiegelpaare.");
  }

  const perDriveCapacity = Math.min(...driveCapacitiesTb);
  switch (level) {
    case "0": return driveCapacitiesTb.length * perDriveCapacity;
    case "1": return perDriveCapacity;
    case "5": return (driveCapacitiesTb.length - 1) * perDriveCapacity;
    case "6": return (driveCapacitiesTb.length - 2) * perDriveCapacity;
    case "10": return (driveCapacitiesTb.length / 2) * perDriveCapacity;
  }
}
