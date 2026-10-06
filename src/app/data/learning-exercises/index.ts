import { backupExercises } from "./backup.ts";
import { dataCalculationExercises } from "./data-calculations.ts";
import { clientInstallationExercises } from "./client-installation.ts";
import { networkDeviceExercises } from "./network-devices.ts";
import { networkTopologyExercises } from "./network-topologies.ts";
import { osiTcpIpExercises } from "./osi-tcp-ip.ts";

export { backupExerciseDefinitions, backupExercises } from "./backup.ts";
export { dataCalculationExerciseDefinitions, dataCalculationExercises } from "./data-calculations.ts";
export { clientInstallationExerciseDefinitions, clientInstallationExercises } from "./client-installation.ts";
export { networkDeviceExerciseDefinitions, networkDeviceExercises } from "./network-devices.ts";
export { networkTopologyExerciseDefinitions, networkTopologyExercises } from "./network-topologies.ts";
export { osiTcpIpExerciseDefinitions, osiTcpIpExercises } from "./osi-tcp-ip.ts";

export const learningExercises = Object.freeze([
  ...osiTcpIpExercises,
  ...networkDeviceExercises,
  ...networkTopologyExercises,
  ...backupExercises,
  ...dataCalculationExercises,
  ...clientInstallationExercises,
]);
