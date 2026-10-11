import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Incident } from "../form/types";

export type Saved = { incident: Incident; changed: string[] };

const OutputPanel = ({ saved }: { saved?: Saved }) => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h5" mb={2}>
      Output
    </Typography>
    {saved ? (
      <>
        <Stack
          direction="row"
          gap={1}
          flexWrap="wrap"
          alignItems="center"
          mb={2}
          data-testid="changed"
        >
          <Typography variant="body2" color="text.secondary">
            {saved.changed.length > 0 ? "Changed:" : "No changes"}
          </Typography>
          {saved.changed.map((path) => (
            <Chip key={path} size="small" color="primary" variant="outlined" label={path} />
          ))}
        </Stack>
        <Box component="pre" sx={{ m: 0, fontSize: 13, overflow: "auto" }} data-testid="output">
          {JSON.stringify(saved.incident, null, 2)}
        </Box>
      </>
    ) : (
      <Typography color="text.secondary">
        Submit the form to see the updated incident data.
      </Typography>
    )}
  </Paper>
);

export default OutputPanel;
