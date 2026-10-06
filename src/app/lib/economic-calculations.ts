export type ProcurementPriceInput = {
  listPriceNet: number;
  discountPercent: number;
  cashDiscountPercent: number;
  vatPercent: number;
};

export function calculateProcurementPrice(input: ProcurementPriceInput) {
  assertMoney(input.listPriceNet, "Listenpreis");
  assertPercent(input.discountPercent, "Rabatt");
  assertPercent(input.cashDiscountPercent, "Skonto");
  assertPercent(input.vatPercent, "Umsatzsteuer");
  const discountAmount = roundMoney(input.listPriceNet * input.discountPercent / 100);
  const discountedNet = roundMoney(input.listPriceNet - discountAmount);
  const cashDiscountAmount = roundMoney(discountedNet * input.cashDiscountPercent / 100);
  const payableNet = roundMoney(discountedNet - cashDiscountAmount);
  const vatAmount = roundMoney(payableNet * input.vatPercent / 100);
  return {
    discountAmount,
    discountedNet,
    cashDiscountAmount,
    payableNet,
    vatAmount,
    payableGross: roundMoney(payableNet + vatAmount),
  };
}

export function calculateTco(input: { acquisitionCost: number; oneTimeCosts?: number; annualOperatingCost: number; years: number }) {
  assertMoney(input.acquisitionCost, "Anschaffungskosten");
  assertMoney(input.oneTimeCosts ?? 0, "Einmalkosten");
  assertMoney(input.annualOperatingCost, "jährliche Betriebskosten");
  if (!Number.isInteger(input.years) || input.years <= 0) throw new Error("Der TCO-Zeitraum muss aus positiven ganzen Jahren bestehen.");
  return roundMoney(input.acquisitionCost + (input.oneTimeCosts ?? 0) + input.annualOperatingCost * input.years);
}

export function calculatePaybackMonths(investment: number, annualNetSavings: number) {
  assertMoney(investment, "Investition");
  if (!Number.isFinite(annualNetSavings) || annualNetSavings <= 0) throw new Error("Die jährliche Nettoeinsparung muss positiv sein.");
  return roundTo(investment / annualNetSavings * 12, 1);
}

export function calculateProfitabilityPercent(annualProfit: number, investedCapital: number) {
  if (!Number.isFinite(annualProfit)) throw new Error("Der Jahresgewinn muss eine Zahl sein.");
  if (!Number.isFinite(investedCapital) || investedCapital <= 0) throw new Error("Das eingesetzte Kapital muss positiv sein.");
  return roundTo(annualProfit / investedCapital * 100, 1);
}

export function calculateWeightedUtility(criteria: readonly { weightPercent: number; rating: number }[]) {
  if (criteria.length === 0) throw new Error("Eine Nutzwertanalyse benötigt Kriterien.");
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weightPercent, 0);
  if (Math.abs(totalWeight - 100) > 0.000_001) throw new Error("Die Gewichtungen müssen zusammen 100 Prozent ergeben.");
  for (const criterion of criteria) {
    assertPercent(criterion.weightPercent, "Gewichtung");
    if (!Number.isFinite(criterion.rating) || criterion.rating < 0 || criterion.rating > 10) throw new Error("Bewertungen müssen zwischen 0 und 10 liegen.");
  }
  return roundTo(criteria.reduce((sum, criterion) => sum + criterion.weightPercent * criterion.rating / 100, 0), 2);
}

function assertMoney(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} muss eine nichtnegative Zahl sein.`);
}

function assertPercent(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${label} muss zwischen 0 und 100 Prozent liegen.`);
}

function roundMoney(value: number) {
  return roundTo(value, 2);
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
