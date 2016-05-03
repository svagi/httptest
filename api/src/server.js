import { app } from './app'

const PORT = parseInt(process.env.PORT, 10)
const server = app.listen(PORT, () => {
  console.log('Server running on port ' + server.address().port)
})
