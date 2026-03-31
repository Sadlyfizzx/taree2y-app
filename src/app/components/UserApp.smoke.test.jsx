import { describe, expect, it } from 'vitest';
import UserApp from './UserApp';

describe('UserApp module smoke', () => {
  it('exports the app shell component', () => {
    expect(typeof UserApp).toBe('function');
  });
});
