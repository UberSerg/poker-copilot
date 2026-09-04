import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../app/App'

describe('App shell', () => {
  it('renders Russian foundation shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Poker Copilot' })).toBeTruthy()
    expect(screen.getByText("Учебный калькулятор Texas Hold'em")).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Стол' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Действия' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Расчёты' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Рекомендация' })).toBeTruthy()
  })
})
