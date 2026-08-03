// test-parse.js
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const form = new FormData();
form.append('file', fs.createReadStream('./sample-stock.csv'));

fetch('http://localhost:5009/api/bulk/parse', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNGUyYmUwNWVmZTIxOTVhZTY2NjEwOSIsImlhdCI6MTc4NTY5NTk4MywiZXhwIjoxNzg1NzgyMzgzfQ.jVTXMaipz-CWTCS8nO89ODO9RgkIwxW93A3IZlndyt8',
    ...form.getHeaders(),
  },
  body: form,
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));