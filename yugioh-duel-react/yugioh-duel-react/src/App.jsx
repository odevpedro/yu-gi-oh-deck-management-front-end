import { useEffect, useCallback } from 'react'
import { DuelProvider, useDuel } from './contexts/DuelContext'
import HUD          from './components/HUD'
import ContextPanel from './components/ContextPanel'
import DuelField    from './components/DuelField'
import DeckViewer   from './components/DeckViewer'
import PhaseOverlay from './components/PhaseOverlay'
import CardContextMenu from './components/CardContextMenu'
import DebugPanel     from './components/DebugPanel'

function DuelApp() {
  const { initDeck, setHandCards, clearSelection, selectedCard } = useDuel()

  useEffect(() => {
    initDeck()
    const urls = [
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Fusion+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Synchro+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=XYZ+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Link+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Effect+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Spell+Card&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Trap+Card&num=1&offset=0',
    ]
    Promise.all(urls.map(u => fetch(u).then(r => r.json())))
      .then(results => setHandCards(results.map(r => r.data[0])))
      .catch(() => setHandCards(Array.from({ length: 7 }, (_, i) => ({
        id: i + 1, name: `Card ${i+1}`,
        type: ['Fusion Monster','Synchro Monster','XYZ Monster','Link Monster',
               'Effect Monster','Spell Card','Trap Card'][i],
        card_images: [{ image_url: '' }],
      }))))
  }, []) // eslint-disable-line

  const onBgClick = useCallback((e) => {
    if (!e.target.closest('.card-wrap') && !e.target.closest('[data-zone-key]')
        && !e.target.closest('.action-bar') && !e.target.closest('.ccm')
        && selectedCard) {
      clearSelection()
    }
  }, [selectedCard, clearSelection])

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onClick={onBgClick}
    >
      <HUD />
      <DebugPanel />
      <div className="board-layout">
        <ContextPanel />
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', minWidth:0, height:'100%' }}>
          <DuelField />
        </div>
      </div>
      <PhaseOverlay />
      <DeckViewer />
      <CardContextMenu />
    </div>
  )
}

export default function App() {
  return (
    <DuelProvider>
      <DuelApp />
    </DuelProvider>
  )
}