import { BrowserRouter, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import { MetiersProvider } from './lib/MetiersContext'
import { SelectionProvider } from './lib/SelectionContext'
import About from './pages/About'
import Catalogue from './pages/Catalogue'
import Explorer from './pages/Explorer'
import Home from './pages/Home'
import MetierPage from './pages/MetierPage'
import NotFound from './pages/NotFound'
import Panier from './pages/Panier'

export default function App() {
  return (
    <MetiersProvider>
      <SelectionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="univers" element={<Catalogue />} />
            <Route path="ce-qui-m-anime" element={<Explorer />} />
            <Route path="metier/:code" element={<MetierPage />} />
            <Route path="a-propos" element={<About />} />
            <Route path="panier" element={<Panier />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </SelectionProvider>
    </MetiersProvider>
  )
}
