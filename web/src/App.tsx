import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Home } from './pages/Home'
import { Seasons } from './pages/Seasons'
import { SeasonDetail } from './pages/SeasonDetail'
import { Drivers } from './pages/Drivers'
import { DriverDetail } from './pages/DriverDetail'

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/seasons" element={<Seasons />} />
        <Route path="/seasons/:name" element={<SeasonDetail />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/drivers/:name" element={<DriverDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
