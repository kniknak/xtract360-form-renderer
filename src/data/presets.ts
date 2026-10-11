import configurationToImplement from "./configurationToImplement.json";
import requiredAndConditional from "./requiredAndConditional.json";
import sampleConfiguration from "./sampleConfiguration.jsonc?raw";
import incident from "./incident.json";

export type Preset = { name: string; config: string };

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export const presets: Preset[] = [
  { name: "Configuration to implement", config: pretty(configurationToImplement) },
  { name: "Required & conditional fields", config: pretty(requiredAndConditional) },
  { name: "Sample configuration (spec)", config: sampleConfiguration },
];

export const initialIncident = pretty(incident);
