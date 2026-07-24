import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface ConsolePaneProps {
  logs: { msg: string, type: 'info' | 'error' | 'warning', time: string }[];
  isConsoleOpen: boolean;
}

export function ConsolePane({ logs, isConsoleOpen }: ConsolePaneProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isConsoleOpen]);

  if (!isConsoleOpen) return null;

  return (
    <Box className="console-pane">
      <Typography variant="h6" className="console-title">Console Log</Typography>
      <Box ref={logContainerRef} className="console-logs">
        {logs.map((log, i) => (
          <div key={i} className={`log-entry log-${log.type}`}>
            [{log.time}] {log.msg}
          </div>
        ))}
      </Box>
    </Box>
  );
}
