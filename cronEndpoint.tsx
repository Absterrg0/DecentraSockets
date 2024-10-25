const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Health check/keep-alive endpoint
app.get('/keep-alive', (req, res) => {
  res.send('WebSocket server is alive');
});

app.listen(port, () => {
  console.log(`WebSocket server listening on port ${port}`);
});
