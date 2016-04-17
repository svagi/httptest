import { app } from './app'

const server = app.listen(process.env.PORT, () => {
  console.log('Server running on port ' + server.address().port)
})
