import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from Express server!' })
})

app.post('/score', (req, res) => {
  const { score } = req.body
  console.log('Received score:', score)

  res.json({ ok: true, received: score })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

