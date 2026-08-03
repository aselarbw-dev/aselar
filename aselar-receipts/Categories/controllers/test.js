// test.js
fetch('http://localhost:5009/api/bulk/commit', {
  method: 'POST',
 headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNGUyYmUwNWVmZTIxOTVhZTY2NjEwOSIsImlhdCI6MTc4NTY5NTk4MywiZXhwIjoxNzg1NzgyMzgzfQ.jVTXMaipz-CWTCS8nO89ODO9RgkIwxW93A3IZlndyt8'
},
  body: JSON.stringify({
    rows: [
    {
  category: "Spirits",
  name: "Jameson 750ml",
  costPrice: 180,
  sellingPrice: 250,
  quantity: 12,
  unit: "bottle",
  expiryDate: "2029-01-01",
  categoryDecision: { action: "create_new" },
  itemDecision: { action: "create_new" }
}
    ]
  })
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));

