import configurationToImplement from "./configurationToImplement.json?raw";
import incident from "./incident.json?raw";
import requiredAndConditional from "./requiredAndConditional.json?raw";
import sampleConfiguration from "./sampleConfiguration.jsonc?raw";

export const presets = [
  { name: "Configuration to implement", configText: configurationToImplement },
  { name: "Required & conditional fields", configText: requiredAndConditional },
  { name: "Sample configuration (spec)", configText: sampleConfiguration },
];

export const initialIncidentText = incident;
