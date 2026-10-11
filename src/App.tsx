import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { parse as parseJsonc } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";
import ConfigEditor from "./components/ConfigEditor";
import type { Sources } from "./components/ConfigEditor";
import OutputPanel from "./components/OutputPanel";
import type { Saved } from "./components/OutputPanel";
import { initialIncidentText, presets } from "./data/presets";
import DynamicForm from "./form/DynamicForm";
import { parseConfig } from "./form/engine";
import { isRecord } from "./form/guards";

const CUSTOM = -1;

const readJson = (text: string): unknown => {
  const errors: ParseError[] = [];
  const value: unknown = parseJsonc(text, errors, { allowTrailingComma: true });
  return errors.length > 0 ? undefined : value;
};

const load = ({ configText, incidentText }: Sources) => {
  const config = readJson(configText);
  if (config === undefined) return { error: "Configuration is not valid JSON" };

  const incident = readJson(incidentText);
  if (!isRecord(incident)) return { error: "Incident data must be a JSON object" };

  return { ...parseConfig(config), incident };
};

const App = () => {
  const [presetIndex, setPresetIndex] = useState(0);
  const [editing, setEditing] = useState<Sources>({
    configText: presets[0].configText,
    incidentText: initialIncidentText,
  });
  const [applied, setApplied] = useState({ sources: editing, version: 0 });
  const [saved, setSaved] = useState<Saved>();

  const loaded = useMemo(() => load(applied.sources), [applied.sources]);

  const apply = (sources: Sources) => {
    setEditing(sources);
    setApplied(({ version }) => ({ sources, version: version + 1 }));
    setSaved(undefined);
  };

  const selectPreset = (index: number) => {
    setPresetIndex(index);
    apply({ ...editing, configText: presets[index].configText });
  };

  const applyEdits = () => {
    setPresetIndex(CUSTOM);
    apply(editing);
  };

  return (
    <Box sx={{ bgcolor: "grey.100", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          gap={2}
          flexWrap="wrap"
        >
          <Typography variant="h4" component="h1">
            Dynamic Form Renderer
          </Typography>
          <TextField
            select
            size="small"
            label="Configuration"
            value={presetIndex}
            onChange={(event) => selectPreset(Number(event.target.value))}
            sx={{ minWidth: 280 }}
          >
            {presets.map((preset, index) => (
              <MenuItem key={preset.name} value={index}>
                {preset.name}
              </MenuItem>
            ))}
            <MenuItem value={CUSTOM} disabled>
              Custom (edited)
            </MenuItem>
          </TextField>
        </Stack>

        <ConfigEditor sources={editing} onChange={setEditing} onApply={applyEdits} />

        {"error" in loaded ? (
          <Alert severity="error">{loaded.error}</Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" mb={3}>
                  Incident details
                </Typography>
                {loaded.warnings.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    {loaded.warnings.map((warning) => (
                      <div key={warning}>{warning}</div>
                    ))}
                  </Alert>
                )}
                <DynamicForm
                  key={applied.version}
                  fields={loaded.fields}
                  incident={loaded.incident}
                  onSubmit={(incident, changed) => setSaved({ incident, changed })}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <OutputPanel saved={saved} />
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default App;
