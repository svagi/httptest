import { app } from './app'

const server = app.listen(process.env.API_PORT, () => {
  console.log('Running on http://localhost:' + server.address().port)
})
