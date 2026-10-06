"use client";

import { FormEvent, useId, useState } from "react";
import type { ReactNode } from "react";
import type { LabAttemptView, LabConfigurationAction, LabControlView } from "../../lib/interactive-lab.ts";
import { getLabDeviceTypeLabel } from "../../lib/lab-workspace-model.ts";

type SubmitConfiguration = (action: LabConfigurationAction, onSuccess?: () => void) => void;
type NetworkField = "ipv4Address" | "prefixLength" | "gateway" | "dnsServer";
type NetworkValues = Record<NetworkField, string>;
type NetworkControl = Extract<LabControlView, { kind: "set-ipv4-address" | "set-prefix-length" | "set-default-gateway" | "set-dns-server" }>;
type DeviceSpecificControl = Exclude<LabControlView, NetworkControl>;

const emptyNetworkValues: NetworkValues = { ipv4Address: "", prefixLength: "", gateway: "", dnsServer: "" };
const networkKinds = new Set<LabControlView["kind"]>(["set-ipv4-address", "set-prefix-length", "set-default-gateway", "set-dns-server"]);

export function LabConfiguration({ attempt, pending, submit }: {
  attempt: LabAttemptView;
  pending: boolean;
  submit: SubmitConfiguration;
}) {
  const [feedback, setFeedback] = useState("");
  const selected = attempt.devices.find((device) => device.id === attempt.selectedDeviceId)!;
  const networkControls = attempt.controls.filter(isNetworkControl);
  const otherControls = attempt.controls.filter((control): control is DeviceSpecificControl => !isNetworkControl(control));
  const withFeedback = (message: string): SubmitConfiguration => (action, onSuccess) => submit(action, () => {
    onSuccess?.();
    setFeedback(message);
  });

  return <section aria-labelledby="configuration-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Aktives Gerät · {getLabDeviceTypeLabel(selected.type)}</p>
    <h2 id="configuration-heading" className="mt-1 text-xl font-bold text-slate-950">Konfiguration — {selected.label}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Hier werden ausschließlich bewusst eingegebene Werte geändert. Aktuelle Werte ermittelst du im Terminal.</p>

    {attempt.controls.length === 0 && <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Für dieses Gerät ist keine kontrollierte Änderung vorgesehen. Nutze seine simulierten Diagnosewerkzeuge.</p>}

    {networkControls.length > 0 && <NetworkConfigurationForm key={`${attempt.selectedDeviceId}-${networkControls.map((control) => control.kind).join("-")}`} controls={networkControls} pending={pending} submit={withFeedback("Netzwerkkonfiguration wurde übernommen. Die Eingabefelder sind wieder leer.")} />}

    {otherControls.length > 0 && <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
      {otherControls.map((control) => <DeviceControl key={controlKey(control)} control={control} pending={pending} submit={withFeedback("Konfigurationsänderung wurde übernommen.")} />)}
    </div>}

    <p className="mt-4 min-h-5 text-sm font-semibold text-emerald-800" role="status" aria-live="polite">{feedback}</p>
  </section>;
}

function NetworkConfigurationForm({ controls, pending, submit }: {
  controls: readonly LabControlView[];
  pending: boolean;
  submit: SubmitConfiguration;
}) {
  const [values, setValues] = useState<NetworkValues>(emptyNetworkValues);
  const [localError, setLocalError] = useState("");
  const id = useId();
  const fields = new Set(controls.map((control) => control.kind));

  const update = (field: NetworkField, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const apply = (event: FormEvent) => {
    event.preventDefault();
    setLocalError("");
    const patch: Extract<LabConfigurationAction, { kind: "set-network-configuration" }>["patch"] = {};
    if (fields.has("set-ipv4-address") && values.ipv4Address.trim()) patch.ipv4Address = values.ipv4Address.trim();
    if (fields.has("set-prefix-length") && values.prefixLength.trim()) patch.prefixLength = Number(values.prefixLength.trim());
    if (fields.has("set-default-gateway") && values.gateway.trim()) patch.gateway = values.gateway.trim();
    if (fields.has("set-dns-server") && values.dnsServer.trim()) patch.dnsServer = values.dnsServer.trim();
    if (Object.keys(patch).length === 0) {
      setLocalError("Trage mindestens einen Wert ein. Leere Felder bleiben unverändert.");
      return;
    }
    submit({ kind: "set-network-configuration", patch }, () => setValues(emptyNetworkValues));
  };

  return <form onSubmit={apply} className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
    <fieldset>
      <legend className="font-bold text-slate-950">Netzwerk-IP-Einstellungen bearbeiten</legend>
      <p className="mt-1 text-xs leading-5 text-slate-600"><strong>Leer = unverändert.</strong> Die Felder zeigen absichtlich keine aktuelle oder erwartete Konfiguration.</p>
      <div className="mt-4 grid gap-4">
        {fields.has("set-ipv4-address") && <NetworkInput id={`${id}-ipv4`} label="IPv4-Adresse" value={values.ipv4Address} placeholder="192.168.x.x" onChange={(value) => update("ipv4Address", value)} />}
        {fields.has("set-prefix-length") && <NetworkInput id={`${id}-prefix`} label="Präfixlänge" value={values.prefixLength} placeholder="24" inputMode="numeric" onChange={(value) => update("prefixLength", value)} />}
        {fields.has("set-default-gateway") && <NetworkInput id={`${id}-gateway`} label="Standardgateway" value={values.gateway} placeholder="192.168.x.x" onChange={(value) => update("gateway", value)} />}
        {fields.has("set-dns-server") && <NetworkInput id={`${id}-dns`} label="Bevorzugter DNS-Server" value={values.dnsServer} placeholder="192.168.x.x" onChange={(value) => update("dnsServer", value)} />}
      </div>
    </fieldset>
    {localError && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{localError}</p>}
    <button disabled={pending} className={`mt-4 w-full ${secondaryButton}`}>Eingegebene Werte anwenden</button>
  </form>;
}

function NetworkInput({ id, label, value, placeholder, inputMode, onChange }: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  return <div><label htmlFor={id} className="text-sm font-bold text-slate-900">{label}</label><input id={id} value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode ?? "decimal"} autoComplete="off" placeholder={placeholder} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-base placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" /></div>;
}

function DeviceControl({ control, pending, submit }: { control: DeviceSpecificControl; pending: boolean; submit: SubmitConfiguration }) {
  if (control.kind === "renew-dhcp") return <ControlSection title="DHCP-Konfiguration"><button type="button" disabled={pending} onClick={() => submit({ kind: "renew-dhcp" })} className={secondaryButton}>{control.label}</button></ControlSection>;
  if (control.kind === "set-service-state") return <ControlSection title="Dienstkonfiguration"><p className="text-sm font-bold text-slate-900">{control.label}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => submit({ kind: "set-service-state", service: control.service, state: "running" })} className={secondaryButton}>Dienst starten</button><button type="button" disabled={pending} onClick={() => submit({ kind: "set-service-state", service: control.service, state: "stopped" })} className={secondaryButton}>Dienst stoppen</button></div></ControlSection>;
  if (control.kind === "set-firewall-rule-action") return <ControlSection title="Firewall-Regelkonfiguration"><p className="text-sm font-bold text-slate-900">{control.label}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => submit({ kind: "set-firewall-rule-action", ruleId: control.ruleId, action: "allow" })} className={secondaryButton}>Erlauben</button><button type="button" disabled={pending} onClick={() => submit({ kind: "set-firewall-rule-action", ruleId: control.ruleId, action: "deny" })} className={secondaryButton}>Blockieren</button></div></ControlSection>;
  return <ValueControl control={control} pending={pending} submit={submit} />;
}

function ValueControl({ control, pending, submit }: { control: Exclude<LabControlView, { kind: "renew-dhcp" | "set-service-state" | "set-firewall-rule-action" | "set-dns-server" | "set-default-gateway" | "set-ipv4-address" | "set-prefix-length" }>; pending: boolean; submit: SubmitConfiguration }) {
  const [value, setValue] = useState("");
  const id = useId();
  const numeric = control.kind === "set-service-port" || control.kind === "set-access-vlan";
  const heading = control.kind === "set-access-vlan" ? "Switchport-Konfiguration" : control.kind === "set-dns-record" ? "DNS-Zonenkonfiguration" : control.kind === "set-dhcp-option" ? "DHCP-Optionen" : control.kind === "set-service-port" ? "Dienstport-Konfiguration" : "Dateisystem-Berechtigung";
  const placeholder = control.kind === "set-file-mode" ? "vier Oktalziffern" : numeric ? control.kind === "set-access-vlan" ? "1–4094" : "1–65535" : "192.168.x.x";
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const onSuccess = () => setValue("");
    if (control.kind === "set-file-mode") submit({ kind: control.kind, path: control.path, mode: trimmed }, onSuccess);
    else if (control.kind === "set-dns-record") submit({ kind: control.kind, hostname: control.hostname, address: trimmed }, onSuccess);
    else if (control.kind === "set-dhcp-option") submit({ kind: control.kind, option: control.option, value: trimmed }, onSuccess);
    else if (control.kind === "set-service-port") submit({ kind: control.kind, service: control.service, port: Number(trimmed) }, onSuccess);
    else submit({ kind: control.kind, portId: control.portId, vlan: Number(trimmed) }, onSuccess);
  };
  return <ControlSection title={heading}><form onSubmit={apply}><label htmlFor={id} className="text-sm font-bold text-slate-900">{control.label}</label><input id={id} value={value} onChange={(event) => setValue(event.target.value)} inputMode={numeric ? "numeric" : undefined} autoComplete="off" placeholder={placeholder} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" /><button disabled={pending || !value.trim()} className={`mt-2 w-full ${secondaryButton}`}>Wert anwenden</button></form></ControlSection>;
}

function ControlSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h3 className="mb-3 text-sm font-black uppercase tracking-[0.1em] text-blue-800">{title}</h3>{children}</section>;
}

function controlKey(control: LabControlView) {
  const target = "service" in control ? control.service : "path" in control ? control.path : "hostname" in control ? control.hostname : "option" in control ? control.option : "portId" in control ? control.portId : "ruleId" in control ? control.ruleId : "single";
  return `${control.kind}-${target}`;
}

function isNetworkControl(control: LabControlView): control is NetworkControl {
  return networkKinds.has(control.kind);
}

const secondaryButton = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60";
