import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Button, Stack } from '@mui/material';
import { GameItem } from '../types';

interface GameTableProps {
  displayResults: GameItem[];
  onConvert: (item: GameItem) => void;
  hasScanned: boolean;
}

function ActionCell({ item, onConvert }: { item: GameItem, onConvert: (item: GameItem) => void }) {
  if (item.convertState === 'Update Available') {
    return <Button variant="contained" color="info" size="small" onClick={() => onConvert(item)}>Update</Button>;
  }
  
  if (item.isConverted || item.convertState === 'Already Converted') {
    return <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Already Converted</Typography>;
  }
  
  if (!item.hasImgur) {
    return <Button variant="contained" size="small" disabled>Convert</Button>;
  }
  
  if (['Convert', 'Error'].includes(item.convertState)) {
    return <Button variant="contained" color="primary" size="small" onClick={() => onConvert(item)}>Convert</Button>;
  }
  
  if (item.convertState === 'Incomplete') {
    return <Button variant="contained" color="warning" size="small" onClick={() => onConvert(item)}>Resume</Button>;
  }
  
  return <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.convertState}</Typography>;
}

export function GameTable({ displayResults, onConvert, hasScanned }: GameTableProps) {
  return (
    <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: 'auto', borderRadius: 0 }} elevation={0}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Picture</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Game Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Imgur Links</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Other Links</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '150px', textAlign: 'center' }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!hasScanned && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                <Typography variant="h6">Ready to start</Typography>
                <Typography>Click "Scan" above to load TableTop Simulator games from your Workshop folder.</Typography>
              </TableCell>
            </TableRow>
          )}
          {hasScanned && displayResults.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                <Typography variant="h6">No games found</Typography>
                <Typography>There are no games matching your current filters in this directory.</Typography>
              </TableCell>
            </TableRow>
          )}
          {displayResults.map((item, idx) => {
            let rowClass = '';
            if (item.convertState === 'Update Available') rowClass = 'row-update';
            else if (item.isConverted || item.convertState === 'Already Converted') rowClass = 'row-converted';
            else if (item.convertState === 'Queued...') rowClass = 'row-queued';
            else if (item.convertState === 'Converting...') rowClass = 'row-converting';
            else if (item.convertState === 'Done') rowClass = 'row-done';
            else if (item.convertState === 'Incomplete') rowClass = 'row-incomplete';
            else if (item.convertState === 'Error') rowClass = 'row-error';
            else if (item.hasImgur) rowClass = 'row-needs-convert';
            
            return (
              <TableRow key={`${item.id}-${idx}`} className={rowClass}>
                <TableCell>
                  {item.imagePath ? <img src={`file://${item.imagePath}`} className="table-image" /> : 'No Image'}
                </TableCell>
                <TableCell>{item.saveName}</TableCell>
                <TableCell>{item.imgurCount}</TableCell>
                <TableCell>{item.nonImgurCount}</TableCell>
                <TableCell align="center">
                  <Stack spacing={0.5} alignItems="center">
                    <ActionCell item={item} onConvert={onConvert} />
                    {item.progress && <Typography variant="caption" sx={{textAlign: 'center'}}>{item.progress}</Typography>}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
