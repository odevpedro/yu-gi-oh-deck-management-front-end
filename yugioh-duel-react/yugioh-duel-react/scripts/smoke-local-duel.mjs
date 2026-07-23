#!/usr/bin/env node
import WebSocket from 'ws'
import { createHash, randomBytes } from 'crypto'

const EVO_HOST = process.env.EVO_HOST || '127.0.0.1'
const EVO_PORT = process.env.EVO_PORT || '7911'
const TIMEOUT_MS = 30000

function fail(msg) {
  console.error(`\u274C  ${msg}`)
  process.exit(1)
}

function ok(msg) {
  console.log(`  \u2705  ${msg}`)
}

function info(msg) {
  console.log(`  \u2139\uFE0F  ${msg}`)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('Smoke local duel\n')
  console.log(`  Conectando a ${EVO_HOST}:${EVO_PORT} ...`)

  const ws = new WebSocket(`ws://${EVO_HOST}:${EVO_PORT}/`)
  let connected = false

  ws.on('open', () => {
    connected = true
  })

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!connected) reject(new Error('Timeout aguardando conexao'))
    }, 5000)
    ws.on('open', () => { clearTimeout(timer); resolve() })
    ws.on('error', err => { clearTimeout(timer); reject(err) })
  })
  ok('WebSocket conectado ao Evolution Server')

  ws.on('error', err => fail(`WebSocket error: ${err.message}`))

  const received = []

  ws.on('message', data => {
    received.push(data)
  })

  // 1. Criar sala
  const roomName = `smoke-${randomBytes(4).toString('hex')}`
  const createRes = await fetch(`http://${EVO_HOST}:${EVO_PORT}/api/room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: roomName, mode: 0, bestOf: 1, rule: 0,
      banlist: '2026.07 OCG', teamQuantity: 1, isRanked: false,
    }),
  })
  if (!createRes.ok) fail(`Criar sala: HTTP ${createRes.status}`)
  const room = await createRes.json()
  ok(`Sala criada: ${room.roomid}`)

  // 2. Construir frame JOIN_GAME
  const roomId = room.roomid
  const password = room.password || ''
  const joinPayload = new Uint8Array(50)
  const view = new DataView(joinPayload.buffer)
  view.setUint16(0, 4962, true)
  view.setUint32(4, roomId, true)
  for (let i = 0; i < Math.min(password.length, 19); i++) {
    view.setUint16(8 + i * 2, password.charCodeAt(i), true)
  }
  view.setUint32(46, 4962, true)

  const frame = new Uint8Array(53)
  new DataView(frame.buffer).setUint16(0, 51, true)
  frame[2] = 0x12
  frame.set(joinPayload, 3)

  ws.send(frame)
  info('Frame JOIN_GAME enviado')
  await sleep(1500)

  // 3. Verificar resposta do servidor
  if (received.length === 0) fail('Nenhuma resposta do servidor apos 1.5s')
  ok(`${received.length} pacote(s) recebido(s)`)

  // 4. Verificar primeiro pacote
  const first = Buffer.from(received[0])
  const msgType = first[2]
  if (msgType === 0x12) ok('Resposta JOIN_GAME confirmada')
  else info(`Tipo de mensagem inicial: 0x${msgType.toString(16)}`)

  // 5. Encerrar
  ws.close()
  console.log(`\n  Smoke concluido: ${received.length} pacotes, ${roomName}`)
  process.exit(0)
}

main().catch(err => {
  console.error(`\n\u274C  Smoke falhou: ${err.message}`)
  process.exit(1)
})
