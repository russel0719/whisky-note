import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
  it('특수문자가 없으면 그대로', () => {
    expect(csvCell('라가불린 16년')).toBe('라가불린 16년');
    expect(csvCell(92)).toBe('92');
    expect(csvCell(null)).toBe('');
  });

  it('쉼표·따옴표·줄바꿈은 따옴표로 감싼다', () => {
    expect(csvCell('꿀, 바닐라')).toBe('"꿀, 바닐라"');
    expect(csvCell('그는 "최고"라고')).toBe('"그는 ""최고""라고"');
    expect(csvCell('첫 줄\n둘째 줄')).toBe('"첫 줄\n둘째 줄"');
  });
});

describe('toCsv', () => {
  it('BOM + CRLF 행 구분', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('﻿a,b\r\n1,"x,y"\r\n');
  });
});
