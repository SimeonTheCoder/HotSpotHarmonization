import Header from './components/Header'
import Home from './pages/Home'

function App() {
  return (
    <>
      <Header />
      <main>
        <Home />
      </main>
      <footer className="footer">
        Data: NASA FIRMS (MODIS and VIIRS active fire detections)
      </footer>
    </>
  )
}

export default App