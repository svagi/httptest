import { app } from './app'
const PORT = process.env.API_PORT
const server = app.listen(PORT, () => {
  console.log('Running on http://localhost:' + PORT)
})
