﻿require('dotenv/config');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'client')));

app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'client', 'not-found.html'));
});

app.listen(process.env.PORT);
