import { useMemo, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { initialIncident, presets } from "./data/presets";
import DynamicForm from "./form/DynamicForm";
import { parseConfig } from "./form/engine";
import type { Incident } from "./form/types";

type Sources = { config: string; incident: string };

const readJson = (label: string, text: string) => {
  const errors: ParseError[] = [];
  const value: unknown = parseJsonc(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) throw new Error(`${label} is not valid JSON`);
  return value;
};

const load = ({ config, incident }: Sources) => {
  try {
    const data = readJson("Incident data", incident);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("Incident data must be an object");
    }
    return { ...parseConfig(readJson("Configuration", config)), incident: data as Incident };
  } catch (error) {
    return { error: (error as Error).message };
  }
};

const App = () => {
  const [presetIndex, setPresetIndex] = useState(0);
  const [editing, setEditing] = useState<Sources>({ config: presets[0].config, incident: initialIncident });
  const [applied, setApplied] = useState({ sources: editing, version: 0 });
  const [saved, setSaved] = useState<Incident>();

  const loaded = useMemo(() => load(applied.sources), [applied.sources]);

  const apply = (sources: Sources) => {
    setEditing(sources);
    setApplied(({ version }) => ({ sources, version: version + 1 }));
    setSaved(undefined);
  };

  const selectPreset = (index: number) => {
    setPresetIndex(index);
    apply({ ...editing, config: presets[index].config });
  };

  return (
    <Box sx={{ bgcolor: "grey.100", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} gap={2} flexWrap="wrap">
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
          </TextField>
        </Stack>

        <Accordion disableGutters sx={{ mb: 3 }}>
          <AccordionSummary>
            <Typography>Edit configuration &amp; incident data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {(["config", "incident"] as const).map((source) => (
                <Grid item xs={12} md={6} key={source}>
                  <TextField
                    label={source === "config" ? "Configuration (JSON)" : "Incident data (JSON)"}
                    multiline
                    fullWidth
                    minRows={12}
                    maxRows={24}
                    value={editing[source]}
                    onChange={(event) => setEditing({ ...editing, [source]: event.target.value })}
                    InputProps={{ sx: { fontFamily: "monospace", fontSize: 13 } }}
                  />
                </Grid>
              ))}
            </Grid>
            <Stack direction="row" justifyContent="flex-end" mt={2}>
              <Button variant="outlined" onClick={() => apply(editing)}>
                Apply
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>

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
                  onSubmit={setSaved}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" mb={2}>
                  Output
                </Typography>
                {saved ? (
                  <Box component="pre" sx={{ m: 0, fontSize: 13, overflow: "auto" }} data-testid="output">
                    {JSON.stringify(saved, null, 2)}
                  </Box>
                ) : (
                  <Typography color="text.secondary">Submit the form to see the updated incident data.</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default App;
