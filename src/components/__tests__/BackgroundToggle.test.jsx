import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BackgroundToggle from '../BackgroundToggle';

describe('BackgroundToggle', () => {
  test('renders options and calls onChange when clicked', () => {
    const handleChange = jest.fn();
    render(<BackgroundToggle currentMode="checkerboard" onChange={handleChange} />);

    // labels are Japanese: '格子', '白', '黒'
    const whiteBtn = screen.getByText('白');
    expect(whiteBtn).toBeInTheDocument();

    fireEvent.click(whiteBtn);
    expect(handleChange).toHaveBeenCalledWith('white');
  });
});

