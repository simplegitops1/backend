require ('dotenv'). config()

const express = require('express')

const app = express()

const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/vite', (req, res) => {
    res.send('chanchal!')
})
app.get('/youtube',(req,res) => {
    res.send('<h3>please login youtube<h3>')
})

app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${port}`)
})