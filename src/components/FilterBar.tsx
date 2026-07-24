import React from 'react';
import { Box, TextField, FormGroup, FormControlLabel, Checkbox, Typography } from '@mui/material';

export function FilterBar({
  search, setSearch,
  showOnlyImgur, setShowOnlyImgur,
  hideConverted, setHideConverted,
  combineRows, setCombineRows
}: any) {
  return (
    <Box className="header-bar filter-bar">
      <TextField 
        fullWidth size="small" placeholder="Search games by name..." 
        value={search} onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1 }}
      />
      
      <FormGroup row>
        <FormControlLabel control={<Checkbox checked={showOnlyImgur} onChange={e => setShowOnlyImgur(e.target.checked)} size="small" />} label={<Typography variant="body2">Only Imgur Games</Typography>} />
        <FormControlLabel control={<Checkbox checked={hideConverted} onChange={e => setHideConverted(e.target.checked)} size="small" />} label={<Typography variant="body2">Hide Converted</Typography>} />
        <FormControlLabel control={<Checkbox checked={combineRows} onChange={e => setCombineRows(e.target.checked)} size="small" />} label={<Typography variant="body2">Combine Converted Games</Typography>} />
      </FormGroup>
    </Box>
  );
}
