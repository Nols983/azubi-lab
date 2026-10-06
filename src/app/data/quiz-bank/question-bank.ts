import { activeDirectoryQuestions } from "./questions/active-directory.ts";
import { dhcpQuestions } from "./questions/dhcp.ts";
import { dnsQuestions } from "./questions/dns.ts";
import { ipv4Questions } from "./questions/ipv4.ts";
import { linuxQuestions } from "./questions/linux.ts";
import { networkTroubleshootingQuestions } from "./questions/network-troubleshooting.ts";
import { subnettingQuestions } from "./questions/subnetting.ts";
import { webserverQuestions } from "./questions/webserver.ts";
import { windowsQuestions } from "./questions/windows.ts";
import { backupQuestions } from "./questions/backup.ts";
import { networkDeviceQuestions } from "./questions/network-devices.ts";
import { networkTopologyQuestions } from "./questions/network-topologies.ts";
import { osiTcpIpQuestions } from "./questions/osi-tcp-ip.ts";
import { hardwareQuestions } from "./questions/hardware.ts";
import { privacyQuestions } from "./questions/privacy.ts";
import { securityQuestions } from "./questions/security.ts";
import { storageRaidQuestions } from "./questions/storage-raid.ts";
import { programmingQuestions } from "./questions/programming.ts";
import { modelingQuestions } from "./questions/modeling.ts";
import { projectManagementQuestions } from "./questions/project-management.ts";
import { economicsQuestions } from "./questions/economics.ts";
import { softwareLicensingQuestions } from "./questions/software-licensing.ts";
import { virtualizationCloudQuestions } from "./questions/virtualization-cloud.ts";
import { customerContractQuestions } from "./questions/customer-contracts.ts";
import { qualityHandoverQuestions } from "./questions/quality-handover.ts";
import { dataCalculationQuestions } from "./questions/data-calculations.ts";
import { clientInstallationQuestions } from "./questions/client-installation.ts";
import type { QuestionBankQuestion } from "./types.ts";
import { assertQuestionBankIntegrity } from "./validation.ts";

export const questionBank = [
  ...ipv4Questions,
  ...subnettingQuestions,
  ...dhcpQuestions,
  ...dnsQuestions,
  ...osiTcpIpQuestions,
  ...networkDeviceQuestions,
  ...networkTopologyQuestions,
  ...webserverQuestions,
  ...linuxQuestions,
  ...windowsQuestions,
  ...activeDirectoryQuestions,
  ...backupQuestions,
  ...hardwareQuestions,
  ...storageRaidQuestions,
  ...securityQuestions,
  ...privacyQuestions,
  ...networkTroubleshootingQuestions,
  ...programmingQuestions,
  ...modelingQuestions,
  ...projectManagementQuestions,
  ...economicsQuestions,
  ...softwareLicensingQuestions,
  ...virtualizationCloudQuestions,
  ...customerContractQuestions,
  ...qualityHandoverQuestions,
  ...dataCalculationQuestions,
  ...clientInstallationQuestions,
] as const satisfies readonly QuestionBankQuestion[];

assertQuestionBankIntegrity(questionBank);

export const questionBankById = new Map<QuestionBankQuestion["id"], QuestionBankQuestion>(
  questionBank.map((question) => [question.id, question]),
);
