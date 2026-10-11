import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export type Sources = { configText: string; incidentText: string };

type ConfigEditorProps = {
  sources: Sources;
  onChange: (sources: Sources) => void;
  onApply: () => void;
};

const editors = [
  { key: "configText", label: "Configuration (JSON)" },
  { key: "incidentText", label: "Incident data (JSON)" },
] as const;

const ConfigEditor = ({ sources, onChange, onApply }: ConfigEditorProps) => (
  <Accordion disableGutters sx={{ mb: 3 }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography>Edit configuration &amp; incident data</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Grid container spacing={2}>
        {editors.map(({ key, label }) => (
          <Grid item xs={12} md={6} key={key}>
            <TextField
              label={label}
              multiline
              fullWidth
              minRows={12}
              maxRows={24}
              value={sources[key]}
              onChange={(event) => onChange({ ...sources, [key]: event.target.value })}
              InputProps={{ sx: { fontFamily: "monospace", fontSize: 13 } }}
            />
          </Grid>
        ))}
      </Grid>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button variant="outlined" onClick={onApply}>
          Apply
        </Button>
      </Stack>
    </AccordionDetails>
  </Accordion>
);

export default ConfigEditor;
