export const zoneVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.06, borderColor: 'rgba(200,180,100,.6)', transition: { type: 'spring', stiffness: 300 } },
  tap: { scale: .96 },
}

export const emptyZoneVariants = {
  initial: { opacity: .7 },
  animate: {
    opacity: [.7, 1, .7],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const handCardVariants = {
  initial: { opacity: 0, y: -40, scale: .8 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24 } },
  exit: { opacity: 0, scale: .6, transition: { duration: .2 } },
}

export const phaseOverlayVariants = {
  initial: { opacity: 0, y: -30, scale: .92 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: .35, ease: 'easeOut' } },
  exit: { opacity: 0, scale: .96, transition: { duration: .2 } },
}

export const drawCardVariants = {
  initial: { opacity: 0, x: -60, y: -80, scale: .4, rotate: -15 },
  animate: {
    opacity: 1, x: 0, y: 0, scale: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 20, mass: .8 },
  },
}

export const attackVariants = {
  idle: { x: 0 },
  attacking: {
    x: [0, -5, 5, -3, 3, 0],
    transition: { duration: .4, ease: 'easeInOut' },
  },
}

export const sendToGYVariants = {
  initial: { opacity: 1, scale: 1 },
  animate: {
    opacity: 0, scale: .3, y: 40,
    transition: { duration: .35, ease: 'easeIn' },
  },
}

export const sendToBanishedVariants = {
  initial: { opacity: 1, filter: 'brightness(1) saturate(1)' },
  animate: {
    opacity: 0, filter: 'brightness(2) saturate(0) hue-rotate(270deg)',
    transition: { duration: .4, ease: 'easeIn' },
  },
}

export const specialSummonVariants = {
  initial: { opacity: 0, scale: .3, filter: 'brightness(2.5)' },
  animate: {
    opacity: 1, scale: 1, filter: 'brightness(1)',
    transition: { type: 'spring', stiffness: 180, damping: 16 },
  },
}
