import { getQuizForModule, quizzes } from "./quiz-bank/module-completion.ts";

export type {
  MultipleSelectionQuestion,
  Quiz,
  QuizOption,
  QuizQuestion,
  SingleChoiceQuestion,
} from "./quiz-bank/types.ts";

export { getQuizForModule, quizzes };

export const ipv4FundamentalsQuiz = getRequiredQuiz("ipv4-grundlagen");
export const subnettingQuiz = getRequiredQuiz("subnetting");
export const dhcpQuiz = getRequiredQuiz("dhcp");
export const dnsQuiz = getRequiredQuiz("dns");
export const webserverQuiz = getRequiredQuiz("webserver-grundlagen");
export const linuxQuiz = getRequiredQuiz("linux-grundlagen");
export const windowsQuiz = getRequiredQuiz("windows-grundlagen");
export const activeDirectoryQuiz = getRequiredQuiz("active-directory-grundlagen");
export const networkTroubleshootingQuiz = getRequiredQuiz("netzwerkfehler-systematisch-analysieren");
export const osiTcpIpQuiz = getRequiredQuiz("osi-tcp-ip-modell");
export const networkDevicesQuiz = getRequiredQuiz("netzwerk-koppelelemente");
export const networkTopologiesQuiz = getRequiredQuiz("netzwerktopologien");
export const backupQuiz = getRequiredQuiz("backup-datensicherung");
export const hardwareQuiz = getRequiredQuiz("arbeitsplatz-hardware");
export const storageRaidQuiz = getRequiredQuiz("storage-und-raid");
export const securityQuiz = getRequiredQuiz("it-sicherheit");
export const privacyQuiz = getRequiredQuiz("datenschutz");
export const programmingQuiz = getRequiredQuiz("programmierung-und-pseudocode");
export const modelingQuiz = getRequiredQuiz("uml-und-datenmodellierung");
export const projectManagementQuiz = getRequiredQuiz("projektmanagement");
export const economicsQuiz = getRequiredQuiz("wirtschaftlichkeit-und-beschaffung");
export const softwareLicensingQuiz = getRequiredQuiz("software-und-lizenzierung");
export const virtualizationCloudQuiz = getRequiredQuiz("virtualisierung-und-cloud");
export const customerContractQuiz = getRequiredQuiz("kundenauftrag-kommunikation-und-vertraege");
export const qualityHandoverQuiz = getRequiredQuiz("qualitaetssicherung-und-uebergabe");
export const dataCalculationsQuiz = getRequiredQuiz("datenmengen-zahlensysteme-uebertragungsrechnungen");
export const clientInstallationQuiz = getRequiredQuiz("clientinstallation-boot-datentraeger");

function getRequiredQuiz(moduleSlug: string) {
  const quiz = getQuizForModule(moduleSlug);
  if (!quiz) throw new Error(`Abschlussquiz für ${moduleSlug} fehlt.`);
  return quiz;
}
