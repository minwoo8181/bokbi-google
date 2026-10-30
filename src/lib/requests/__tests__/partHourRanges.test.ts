import { describe, it, expect } from 'vitest';
import { partHourRanges } from '../showing';

describe('partHourRanges: 방문 가능 시간 칩의 시각 범위', () => {
  it('붙어 있는 시간대는 하나로 (점심 1시간 틈 포함)', () => {
    expect(partHourRanges(['MORNING', 'AFTERNOON'])).toEqual([[10, 18]]);
    expect(partHourRanges(['AFTERNOON', 'EVENING'])).toEqual([[13, 21]]);
    expect(partHourRanges(['MORNING', 'AFTERNOON', 'EVENING'])).toEqual([[10, 21]]);
  });
  it('떨어진 시간대는 따로', () => {
    expect(partHourRanges(['MORNING', 'EVENING'])).toEqual([[10, 12], [18, 21]]);
  });
  it('한 시간대만, 순서와 무관', () => {
    expect(partHourRanges(['EVENING'])).toEqual([[18, 21]]);
    expect(partHourRanges(['EVENING', 'MORNING'])).toEqual([[10, 12], [18, 21]]);
    expect(partHourRanges([])).toEqual([]);
  });
});
