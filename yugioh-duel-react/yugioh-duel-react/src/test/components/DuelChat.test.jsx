import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DuelChat from '../../components/DuelChat'

describe('DuelChat', () => {
  it('renders toggle button', () => {
    render(<DuelChat messages={[]} onSend={vi.fn()} />)
    expect(screen.getByText('💬')).toBeTruthy()
  })

  it('opens panel when toggled', () => {
    render(<DuelChat messages={[]} onSend={vi.fn()} />)
    fireEvent.click(screen.getByText('💬'))
    expect(screen.getByPlaceholderText('Digite sua mensagem...')).toBeTruthy()
  })

  it('renders messages', () => {
    const messages = [
      { playerId: 'me', message: 'Hello' },
      { playerId: 'them', message: 'Hi' },
    ]
    render(<DuelChat messages={messages} onSend={vi.fn()} />)
    fireEvent.click(screen.getByText('💬'))
    expect(screen.getByText('Hello')).toBeTruthy()
    expect(screen.getByText('Hi')).toBeTruthy()
  })

  it('calls onSend when submitting', () => {
    const onSend = vi.fn()
    render(<DuelChat messages={[]} onSend={onSend} />)
    fireEvent.click(screen.getByText('💬'))
    const input = screen.getByPlaceholderText('Digite sua mensagem...')
    fireEvent.change(input, { target: { value: 'test message' } })
    fireEvent.click(screen.getByText('Enviar'))
    expect(onSend).toHaveBeenCalledWith('test message')
  })

  it('clears input after send', () => {
    const onSend = vi.fn()
    render(<DuelChat messages={[]} onSend={onSend} />)
    fireEvent.click(screen.getByText('💬'))
    const input = screen.getByPlaceholderText('Digite sua mensagem...')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.click(screen.getByText('Enviar'))
    expect(input.value).toBe('')
  })

  it('does not send empty messages', () => {
    const onSend = vi.fn()
    render(<DuelChat messages={[]} onSend={onSend} />)
    fireEvent.click(screen.getByText('💬'))
    fireEvent.click(screen.getByText('Enviar'))
    expect(onSend).not.toHaveBeenCalled()
  })
})