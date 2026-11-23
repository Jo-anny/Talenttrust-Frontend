import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PAGE_SIZES, SORTS, STATUSES, type ContractQuery, type PageSize, type Sort } from '@/lib/contractQuery';
import { EscrowToolbar } from '../EscrowToolbar';

function setup(overrides: { status?: ContractQuery['status']; sort?: Sort; size?: PageSize; search?: string } = {}) {
  const onStatusChange = vi.fn();
  const onSortChange = vi.fn();
  const onSizeChange = vi.fn();
  const onSearchChange = vi.fn();
  render(
    <EscrowToolbar
      status={overrides.status ?? ''}
      sort={overrides.sort ?? 'newest'}
      size={overrides.size ?? 10}
      search={overrides.search ?? ''}
      onStatusChange={onStatusChange}
      onSortChange={onSortChange}
      onSizeChange={onSizeChange}
      onSearchChange={onSearchChange}
    />,
  );
  return { onStatusChange, onSortChange, onSizeChange, onSearchChange };
}

describe('EscrowToolbar', () => {
  describe('landmarks and labels', () => {
    it('exposes a search landmark with an accessible name', () => {
      setup();
      expect(screen.getByRole('search', { name: 'Filter escrows' })).toBeInTheDocument();
    });

    it('labels the search input, status select and sort select', () => {
      setup();
      expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Sort' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Per page' })).toBeInTheDocument();
    });
  });

  describe('options', () => {
    it('renders "All" followed by every status', () => {
      setup();
      const options = Array.from(screen.getByRole('combobox', { name: 'Status' }).querySelectorAll('option'));
      expect(options.map((o) => o.value)).toEqual(['', ...STATUSES]);
      expect(options[0]).toHaveTextContent('All');
    });

    it('renders every sort with its label', () => {
      setup();
      const options = Array.from(screen.getByRole('combobox', { name: 'Sort' }).querySelectorAll('option'));
      expect(options.map((o) => o.value)).toEqual(Object.keys(SORTS));
      expect(options.map((o) => o.textContent)).toEqual(Object.values(SORTS));
    });

    it('renders every allowed page size', () => {
      setup();
      const options = Array.from(screen.getByRole('combobox', { name: 'Per page' }).querySelectorAll('option'));
      expect(options.map((option) => Number(option.value))).toEqual(PAGE_SIZES);
    });
  });

  describe('controlled values', () => {
    it('reflects the status, sort, page size and search props', () => {
      setup({ status: 'Disputed', sort: 'total', size: 25, search: 'abc' });
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('Disputed');
      expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue('total');
      expect(screen.getByRole('combobox', { name: 'Per page' })).toHaveValue('25');
      expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('abc');
    });
  });

  describe('change handlers', () => {
    it('calls onStatusChange with the selected status value', async () => {
      const { onStatusChange } = setup();
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Funded');
      expect(onStatusChange).toHaveBeenCalledTimes(1);
      expect(onStatusChange).toHaveBeenCalledWith('Funded');
    });

    it('calls onStatusChange with an empty string when "All" is chosen', async () => {
      const { onStatusChange } = setup({ status: 'Completed' });
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'All');
      expect(onStatusChange).toHaveBeenCalledWith('');
    });

    it('calls onSortChange with the sort key, not its label', async () => {
      const { onSortChange } = setup();
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'Most in escrow');
      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(onSortChange).toHaveBeenCalledWith('escrow');
    });

    it('calls onSizeChange with the selected page size', async () => {
      const { onSizeChange } = setup();
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Per page' }), '50');
      expect(onSizeChange).toHaveBeenCalledTimes(1);
      expect(onSizeChange).toHaveBeenCalledWith(50);
    });

    it('calls onSearchChange with the typed text', async () => {
      const { onSearchChange } = setup();
      await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'g');
      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith('g');
    });

    it('does not call the status or sort handlers when searching', async () => {
      const { onStatusChange, onSortChange } = setup();
      await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'x');
      expect(onStatusChange).not.toHaveBeenCalled();
      expect(onSortChange).not.toHaveBeenCalled();
    });
  });

  describe('Escape to clear search', () => {
    it('clears the search when Escape is pressed with text present', async () => {
      const { onSearchChange } = setup({ search: 'escrow' });
      const input = screen.getByRole('searchbox', { name: 'Search' });
      input.focus();
      await userEvent.keyboard('{Escape}');
      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith('');
    });

    it('does nothing when Escape is pressed on an empty search', async () => {
      const { onSearchChange } = setup({ search: '' });
      screen.getByRole('searchbox', { name: 'Search' }).focus();
      await userEvent.keyboard('{Escape}');
      expect(onSearchChange).not.toHaveBeenCalled();
    });

    it('ignores other keys when text is present', async () => {
      const { onSearchChange } = setup({ search: 'escrow' });
      screen.getByRole('searchbox', { name: 'Search' }).focus();
      await userEvent.keyboard('{Enter}{Tab}');
      expect(onSearchChange).not.toHaveBeenCalled();
    });
  });
});
