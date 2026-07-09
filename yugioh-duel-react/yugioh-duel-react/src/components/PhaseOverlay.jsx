import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useDuel } from '../contexts/DuelContext'
import { phaseOverlayVariants } from '../utils/animations'

export default function PhaseOverlay() {
  const { phaseOverlay } = useDuel()

  return createPortal(
    <AnimatePresence>
      {phaseOverlay && (
        <motion.div
          key={phaseOverlay.id}
          className="phase-overlay"
          variants={phaseOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="phase-overlay-name">{phaseOverlay.label}</div>
          <div className="phase-overlay-sub">PHASE</div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
