import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App shell', () => {
  it('renders Russian foundation shell with cash table', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Poker Copilot' })).toBeTruthy()
    expect(screen.getByText("Учебный калькулятор Texas Hold'em")).toBeTruthy()
    expect(screen.getByText(/Режим:/)).toBeTruthy()
    expect(screen.getByText('Cash')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Действия' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Расчёты' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'История' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Рекомендация' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Новая раздача' })).toBeTruthy()
    expect(screen.getByText('Ваши карты')).toBeTruthy()
  })
})
