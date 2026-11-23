import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api';
import {
  CONTRACTS_PREFIX,
  contractKey,
  contractsListKey,
  fetcher,
  isContractsListKey,
  shouldRetryOnError,
} from '../swr';

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return { ...actual, api: vi.fn() };
});

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SWR cache keys', () => {
  it('creates the contracts list key with or without filters', () => {
    expect(CONTRACTS_PREFIX).toBe('/api/v1/contracts');
    expect(contractsListKey()).toEqual([CONTRACTS_PREFIX, null]);
    expect(contractsListKey({ status: 'Funded' })).toEqual([
      CONTRACTS_PREFIX,
      { status: 'Funded' },
    ]);
  });

  it('creates a contract key from numeric or string ids', () => {
    expect(contractKey(12)).toBe('/api/v1/contracts/12');
    expect(contractKey('contract-id')).toBe('/api/v1/contracts/contract-id');
  });

  it('recognizes contracts list keys and rejects unrelated keys', () => {
    expect(isContractsListKey(contractsListKey())).toBe(true);
    expect(isContractsListKey([CONTRACTS_PREFIX, { status: 'Funded' }])).toBe(true);
    expect(isContractsListKey('/api/v1/contracts')).toBe(false);
    expect(isContractsListKey(['/api/v1/contracts/12', null])).toBe(false);
    expect(isContractsListKey(null)).toBe(false);
  });
});

describe('fetcher', () => {
  it('omits empty and undefined parameters and disables api retries', async () => {
    await fetcher(contractsListKey({ empty: '', omitted: undefined }));

    expect(mockedApi).toHaveBeenCalledWith(CONTRACTS_PREFIX, { retries: 0 });
  });

  it('encodes parameter values and retains non-string values', async () => {
    await fetcher(
      contractsListKey({
        party: 'A B/+',
        status: 'Funded',
        enabled: false,
        count: 0,
      }),
    );

    expect(mockedApi).toHaveBeenCalledWith(
      '/api/v1/contracts?party=A+B%2F%2B&status=Funded&enabled=false&count=0',
      { retries: 0 },
    );
  });

  it('passes string keys directly and disables api retries', async () => {
    await fetcher('/api/v1/contracts/12');

    expect(mockedApi).toHaveBeenCalledWith('/api/v1/contracts/12', { retries: 0 });
  });
});

describe('shouldRetryOnError', () => {
  it.each([400, 404, 499])('does not retry ApiError status %i', (status) => {
    expect(shouldRetryOnError(new ApiError({ kind: 'http', status }))).toBe(false);
  });

  it.each([500, 503])('retries ApiError status %i', (status) => {
    expect(shouldRetryOnError(new ApiError({ kind: 'http', status }))).toBe(true);
  });

  it('retries network ApiErrors and ordinary errors', () => {
    expect(shouldRetryOnError(new ApiError({ kind: 'network' }))).toBe(true);
    expect(shouldRetryOnError(new Error('Unexpected error'))).toBe(true);
  });
});
